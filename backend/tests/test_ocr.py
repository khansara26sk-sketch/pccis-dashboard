
import io

import pytest
from PIL import Image
from sqlalchemy import func, select

from app.models import (
    AuditEvent,
    ExtractedField,
    ImageEvidence,
    Inspection,
    OCRStatus,
)
from app.services import evidence_service, ocr_service
from app.services.ocr_service import (
    OCRProcessingError,
    OCRResult,
)
from tests.helpers import make_image


def make_inspection(db, user):
    inspection = Inspection(
        inspection_number=f"OCR-{user.id}-{db.scalar(select(func.count()).select_from(Inspection))}",
        inspector_id=user.id,
        product_name="OCR test product",
    )
    db.add(inspection)
    db.commit()
    return inspection


@pytest.fixture()
def owner(create_user):
    return create_user(email="ocr-owner@example.com")


@pytest.fixture()
def setup(client, db, owner, auth_headers, storage_settings):
    inspection = make_inspection(db, owner)
    return client, inspection, auth_headers(owner), storage_settings


def upload(client, inspection_id, headers):
    return client.post(
        f"/api/inspections/{inspection_id}/evidence",
        files={
            "file": (
                "ocr-test.png",
                make_image("PNG", (320, 200)),
                "image/png",
            )
        },
        headers=headers,
    )


# ---- OCR service unit tests -------------------------------------------------


def test_extract_text_calculates_average_confidence(
    tmp_path, storage_settings, monkeypatch
):
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (100, 50), "white").save(image_path)

    def fake_image_to_data(*args, **kwargs):
        return {
            "text": ["Hello", "World", "", "Ignored", "Invalid"],
            "conf": ["80", "100", "50", "-1", "bad"],
        }

    monkeypatch.setattr(
        ocr_service.pytesseract,
        "image_to_data",
        fake_image_to_data,
    )

    result = ocr_service.extract_text(image_path, storage_settings)

    assert result.text == "Hello World"
    assert result.confidence == 90.0


def test_extract_text_returns_none_confidence_for_empty_output(
    tmp_path, storage_settings, monkeypatch
):
    image_path = tmp_path / "empty.png"
    Image.new("RGB", (100, 50), "white").save(image_path)

    monkeypatch.setattr(
        ocr_service.pytesseract,
        "image_to_data",
        lambda *args, **kwargs: {
            "text": ["", "  "],
            "conf": ["-1", "-1"],
        },
    )

    result = ocr_service.extract_text(image_path, storage_settings)

    assert result.text == ""
    assert result.confidence is None


def test_extract_text_wraps_processing_errors(
    tmp_path, storage_settings, monkeypatch
):
    image_path = tmp_path / "error.png"
    Image.new("RGB", (100, 50), "white").save(image_path)

    def fail_ocr(*args, **kwargs):
        raise RuntimeError("simulated OCR failure")

    monkeypatch.setattr(
        ocr_service.pytesseract,
        "image_to_data",
        fail_ocr,
    )

    with pytest.raises(OCRProcessingError):
        ocr_service.extract_text(image_path, storage_settings)


# ---- OCR evidence integration tests ----------------------------------------


def test_upload_saves_ocr_result_and_confidence(
    setup, db, monkeypatch
):
    client, inspection, headers, settings = setup
    received_paths = []

    def fake_extract_text(image_path, _settings):
        received_paths.append(image_path)
        assert image_path.is_file()
        assert image_path.parent == settings.processed_dir

        return OCRResult(
            text="Product Label 123",
            confidence=92.5,
        )

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        fake_extract_text,
    )

    response = upload(client, inspection.id, headers)

    assert response.status_code == 201, response.text
    body = response.json()

    assert body["ocr_status"] == "completed"
    assert body["ocr_error"] is None
    assert len(received_paths) == 1

    evidence = db.scalar(
        select(ImageEvidence).where(ImageEvidence.id == body["id"])
    )

    assert evidence.ocr_status == OCRStatus.COMPLETED

    field = db.scalar(
        select(ExtractedField).where(
            ExtractedField.evidence_id == evidence.id,
            ExtractedField.field_name == "ocr_text",
        )
    )

    assert field is not None
    assert field.inspection_id == inspection.id
    assert field.extracted_value == "Product Label 123"
    assert field.source_text == "Product Label 123"
    assert field.confidence == 92.5

    actions = set(
        db.scalars(
            select(AuditEvent.action).where(
                AuditEvent.inspection_id == inspection.id
            )
        )
    )

    assert "evidence.ocr_started" in actions
    assert "evidence.ocr_completed" in actions


def test_ocr_failure_does_not_fail_or_delete_upload(
    setup, db, monkeypatch
):
    client, inspection, headers, settings = setup

    def fail_ocr(*args, **kwargs):
        raise OCRProcessingError("simulated OCR failure")

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        fail_ocr,
    )

    response = upload(client, inspection.id, headers)

    assert response.status_code == 201, response.text
    body = response.json()

    assert body["preprocessing_status"] == "completed"
    assert body["ocr_status"] == "failed"
    assert body["ocr_error"] == "OCR processing failed"

    evidence = db.scalar(
        select(ImageEvidence).where(ImageEvidence.id == body["id"])
    )

    assert evidence.ocr_status == OCRStatus.FAILED

    original_path = settings.originals_dir / evidence.stored_filename
    assert original_path.is_file()

    failed_event = db.scalar(
        select(AuditEvent).where(
            AuditEvent.inspection_id == inspection.id,
            AuditEvent.action == "evidence.ocr_failed",
        )
    )

    assert failed_event is not None


def test_reprocessing_updates_existing_ocr_record(
    setup, db, monkeypatch
):
    client, inspection, headers, settings = setup

    results = [
        OCRResult("First OCR result", 80.0),
        OCRResult("Updated OCR result", 95.0),
    ]
    received_paths = []

    def fake_extract_text(image_path, _settings):
        received_paths.append(image_path)
        assert image_path.is_file()
        assert image_path.parent == settings.processed_dir
        return results.pop(0)

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        fake_extract_text,
    )

    response = upload(client, inspection.id, headers)

    assert response.status_code == 201, response.text
    evidence_id = response.json()["id"]

    first_field = db.scalar(
        select(ExtractedField).where(
            ExtractedField.evidence_id == evidence_id,
            ExtractedField.field_name == "ocr_text",
        )
    )

    assert first_field.extracted_value == "First OCR result"
    assert first_field.confidence == 80.0

    retry = client.post(
        f"/api/inspections/{inspection.id}/evidence/{evidence_id}/preprocess",
        headers=headers,
    )

    assert retry.status_code == 200, retry.text
    assert retry.json()["ocr_status"] == "completed"
    assert len(received_paths) == 2

    db.expire_all()

    fields = list(
        db.scalars(
            select(ExtractedField).where(
                ExtractedField.evidence_id == evidence_id,
                ExtractedField.field_name == "ocr_text",
            )
        )
    )

    assert len(fields) == 1
    assert fields[0].extracted_value == "Updated OCR result"
    assert fields[0].source_text == "Updated OCR result"
    assert fields[0].confidence == 95.0

    started_count = db.scalar(
        select(func.count()).select_from(AuditEvent).where(
            AuditEvent.inspection_id == inspection.id,
            AuditEvent.action == "evidence.ocr_started",
        )
    )

    completed_count = db.scalar(
        select(func.count()).select_from(AuditEvent).where(
            AuditEvent.inspection_id == inspection.id,
            AuditEvent.action == "evidence.ocr_completed",
        )
    )

    assert started_count == 2
    assert completed_count == 2

def test_get_ocr_result_returns_saved_text_and_confidence(
    setup, monkeypatch
):
    client, inspection, headers, _settings = setup

    def fake_extract_text(image_path, settings):
        return OCRResult(
            text="Product Label 123",
            confidence=94.5,
        )

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        fake_extract_text,
    )

    upload_response = upload(client, inspection.id, headers)

    assert upload_response.status_code == 201
    evidence_id = upload_response.json()["id"]

    response = client.get(
        f"/api/inspections/{inspection.id}/evidence/{evidence_id}/ocr",
        headers=headers,
    )

    assert response.status_code == 200, response.text

    body = response.json()

    assert body["evidence_id"] == evidence_id
    assert body["inspection_id"] == inspection.id
    assert body["status"] == "completed"
    assert body["error"] is None
    assert body["extracted_text"] == "Product Label 123"
    assert body["confidence"] == 94.5

def test_upload_extracts_and_saves_structured_product_fields(
    setup, db, monkeypatch
):
    client, inspection, headers, settings = setup

    ocr_text = """Product Name: Paracetamol
Batch No: B123
Mfg Date: 01/2025
Expiry Date: 01/2027"""

    def fake_extract_text(image_path, _settings):
        return OCRResult(text=ocr_text, confidence=96.0)

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        fake_extract_text,
    )

    response = upload(client, inspection.id, headers)

    assert response.status_code == 201, response.text
    evidence_id = response.json()["id"]

    db.expire_all()

    expected_fields = {
        "product_name": "Paracetamol",
        "batch_number": "B123",
        "manufacturing_date": "01/2025",
        "expiry_date": "01/2027",
    }

    for field_name, expected_value in expected_fields.items():
        field = db.scalar(
            select(ExtractedField).where(
                ExtractedField.evidence_id == evidence_id,
                ExtractedField.field_name == field_name,
            )
        )

        assert field is not None, f"{field_name} record missing"
        assert field.extracted_value == expected_value
        assert field.source_text == ocr_text
        assert field.confidence == 96.0
        assert field.inspection_id == inspection.id