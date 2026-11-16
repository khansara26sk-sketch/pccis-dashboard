import hashlib
import io
import re

import pytest
from PIL import Image
from sqlalchemy import func, select

from app.models import (
    AuditEvent, ImageEvidence, Inspection, InspectionStatus, PreprocessingStatus, UserRole,
)
from app.services import evidence_service
from app.services.image_service import PreprocessingError
from tests.helpers import make_image

IMAGE_CASES = [
    ("PNG", "label.png", "image/png"),
    ("JPEG", "label.jpg", "image/jpeg"),
    ("WEBP", "label.webp", "image/webp"),
]


# ---- helpers ---------------------------------------------------------------------------------
def make_inspection(db, user):
    inspection = Inspection(
        inspection_number=f"INS-T-{user.id}-{db.scalar(select(func.count()).select_from(Inspection))}",
        inspector_id=user.id,
        product_name="Test product",
    )
    db.add(inspection)
    db.commit()
    return inspection


def upload(client, inspection_id, data, filename="label.png", content_type="image/png", headers=None):
    return client.post(
        f"/api/inspections/{inspection_id}/evidence",
        files={"file": (filename, data, content_type)},
        headers=headers,
    )


@pytest.fixture()
def owner(create_user):
    return create_user(email="owner@example.com")


@pytest.fixture()
def setup(client, db, owner, auth_headers, storage_settings):
    """An owner with one inspection and storage in a temp dir."""
    inspection = make_inspection(db, owner)
    return client, inspection, auth_headers(owner), storage_settings


def stored_files(directory):
    return [p for p in directory.glob("*") if p.is_file()] if directory.exists() else []


# ---- successful upload -----------------------------------------------------------------------
@pytest.mark.parametrize("fmt,filename,mime", IMAGE_CASES)
def test_upload_success_persists_metadata_and_files(setup, db, fmt, filename, mime, tmp_path):
    client, inspection, headers, settings = setup
    data = make_image(fmt, (320, 200))
    response = upload(client, inspection.id, data, filename, mime, headers)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["content_type"] == mime
    assert (body["width"], body["height"]) == (320, 200)
    assert body["file_size_bytes"] == len(data)
    assert body["sha256"] == hashlib.sha256(data).hexdigest()
    assert body["preprocessing_status"] == "completed"
    assert body["processed_url"] and body["original_url"]

    row = db.scalar(select(ImageEvidence).where(ImageEvidence.id == body["id"]))
    assert row.inspection_id == inspection.id
    assert row.preprocessing_status == PreprocessingStatus.COMPLETED
    original = settings.originals_dir / row.stored_filename
    assert original.read_bytes() == data  # stored byte-for-byte
    assert (settings.processed_dir / row.processed_stored_filename).is_file()
    assert row.stored_filename != row.processed_stored_filename

    # No server paths or server file names are exposed
    assert str(tmp_path) not in response.text
    for hidden in ("file_path", "stored_filename", "processed_stored_filename"):
        assert hidden not in body


def test_stored_filename_is_server_generated_and_client_name_is_sanitised(setup, db):
    client, inspection, headers, settings = setup
    response = upload(client, inspection.id, make_image("PNG"), "../../evil.png", "image/png", headers)
    assert response.status_code == 201
    assert response.json()["original_filename"] == "evil.png"
    row = db.scalar(select(ImageEvidence))
    assert re.fullmatch(r"[0-9a-f]{32}\.png", row.stored_filename)
    assert [p.parent for p in stored_files(settings.originals_dir)] == [settings.originals_dir]
    assert not (settings.upload_dir.parent / "evil.png").exists()


def test_upload_moves_draft_inspection_to_image_uploaded(setup, db):
    client, inspection, headers, _ = setup
    upload(client, inspection.id, make_image("PNG"), headers=headers)
    db.refresh(inspection)
    assert inspection.status == InspectionStatus.IMAGE_UPLOADED


# ---- authentication --------------------------------------------------------------------------
def test_upload_requires_authentication(setup):
    client, inspection, _, settings = setup
    assert upload(client, inspection.id, make_image("PNG")).status_code == 401
    assert stored_files(settings.originals_dir) == []


def test_upload_rejects_invalid_jwt(setup):
    client, inspection, _, _ = setup
    response = upload(client, inspection.id, make_image("PNG"), headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401


def test_all_evidence_endpoints_require_authentication(setup):
    client, inspection, headers, _ = setup
    evidence_id = upload(client, inspection.id, make_image("PNG"), headers=headers).json()["id"]
    base = f"/api/inspections/{inspection.id}/evidence"
    for method, url in [
        ("get", base), ("get", f"{base}/{evidence_id}"), ("get", f"{base}/{evidence_id}/processed"),
        ("get", f"{base}/{evidence_id}/original"), ("post", f"{base}/{evidence_id}/preprocess"),
    ]:
        assert getattr(client, method)(url).status_code == 401, url


# ---- type / content / size validation --------------------------------------------------------
@pytest.mark.parametrize(
    "filename,mime",
    [("x.gif", "image/gif"), ("x.txt", "text/plain"), ("x.php", "image/png"), ("noextension", "image/png"),
     ("x.png.exe", "image/png"), ("x.png", "text/plain"), ("x.png", "image/jpeg"), ("x.png", "application/octet-stream")],
)
def test_unsupported_extension_or_mime_rejected_with_415(setup, filename, mime):
    client, inspection, headers, settings = setup
    response = upload(client, inspection.id, make_image("PNG"), filename, mime, headers)
    assert response.status_code == 415
    assert stored_files(settings.originals_dir) == []


def test_fake_and_corrupt_images_rejected_with_422(setup, db):
    client, inspection, headers, settings = setup
    good = make_image("PNG", (600, 400))
    cases = [
        ("text posing as png", b"<?php echo 1; ?>", "a.png", "image/png"),
        ("empty file", b"", "a.png", "image/png"),
        ("truncated png", good[: len(good) // 2], "a.png", "image/png"),
        ("gif posing as png", make_image("GIF"), "a.png", "image/png"),
        ("png posing as jpg", good, "a.jpg", "image/jpeg"),
    ]
    for label, data, name, mime in cases:
        response = upload(client, inspection.id, data, name, mime, headers)
        assert response.status_code == 422, label
    assert stored_files(settings.originals_dir) == []
    assert db.scalar(select(func.count()).select_from(ImageEvidence)) == 0


def test_image_exceeding_pixel_limit_rejected(setup, configure_settings):
    client, inspection, headers, settings = setup
    configure_settings(max_image_pixels=10_000)
    response = upload(client, inspection.id, make_image("PNG", (500, 500)), headers=headers)
    assert response.status_code == 422
    assert stored_files(settings.originals_dir) == []


def test_oversized_upload_rejected_with_413_and_nothing_stored(setup, configure_settings, db):
    client, inspection, headers, settings = setup
    configure_settings(max_upload_size_mb=1)
    data = b"\x89PNG\r\n\x1a\n" + b"0" * (1024 * 1024 + 10)
    response = upload(client, inspection.id, data, headers=headers)
    assert response.status_code == 413
    assert stored_files(settings.originals_dir) == []
    assert db.scalar(select(func.count()).select_from(ImageEvidence)) == 0


def test_missing_file_field_is_422(setup):
    client, inspection, headers, _ = setup
    assert client.post(f"/api/inspections/{inspection.id}/evidence", headers=headers).status_code == 422


def test_image_limit_per_inspection(setup, configure_settings):
    client, inspection, headers, _ = setup
    configure_settings(max_images_per_inspection=1)
    assert upload(client, inspection.id, make_image("PNG"), headers=headers).status_code == 201
    assert upload(client, inspection.id, make_image("PNG"), headers=headers).status_code == 409


# ---- inspection association and access control -----------------------------------------------
def test_upload_to_missing_inspection_is_404(setup):
    client, _, headers, _ = setup
    assert upload(client, 99999, make_image("PNG"), headers=headers).status_code == 404


def test_other_users_cannot_access_an_inspections_evidence(setup, create_user, auth_headers):
    client, inspection, owner_headers, _ = setup
    evidence_id = upload(client, inspection.id, make_image("PNG"), headers=owner_headers).json()["id"]
    base = f"/api/inspections/{inspection.id}/evidence"
    for other in (create_user(email="other@example.com"),
                  create_user(email="officer@example.com", role=UserRole.SENIOR_OFFICER)):
        headers = auth_headers(other)
        assert upload(client, inspection.id, make_image("PNG"), headers=headers).status_code == 404
        assert client.get(base, headers=headers).status_code == 404
        assert client.get(f"{base}/{evidence_id}", headers=headers).status_code == 404
        assert client.get(f"{base}/{evidence_id}/processed", headers=headers).status_code == 404
        assert client.get(f"{base}/{evidence_id}/original", headers=headers).status_code == 404
        assert client.post(f"{base}/{evidence_id}/preprocess", headers=headers).status_code == 404


def test_admin_can_access_other_users_evidence(setup, create_user, auth_headers):
    client, inspection, owner_headers, _ = setup
    evidence_id = upload(client, inspection.id, make_image("PNG"), headers=owner_headers).json()["id"]
    admin_headers = auth_headers(create_user(email="admin@example.com", role=UserRole.ADMIN))
    base = f"/api/inspections/{inspection.id}/evidence"
    assert client.get(base, headers=admin_headers).status_code == 200
    assert client.get(f"{base}/{evidence_id}/processed", headers=admin_headers).status_code == 200
    assert upload(client, inspection.id, make_image("PNG"), headers=admin_headers).status_code == 201


def test_evidence_must_belong_to_the_inspection_in_the_url(setup, db, owner):
    client, inspection, headers, _ = setup
    other_inspection = make_inspection(db, owner)
    evidence_id = upload(client, inspection.id, make_image("PNG"), headers=headers).json()["id"]
    response = client.get(f"/api/inspections/{other_inspection.id}/evidence/{evidence_id}", headers=headers)
    assert response.status_code == 404


# ---- listing, metadata, retrieval ------------------------------------------------------------
def test_list_and_metadata(setup):
    client, inspection, headers, _ = setup
    assert client.get(f"/api/inspections/{inspection.id}/evidence", headers=headers).json() == []
    first = upload(client, inspection.id, make_image("PNG"), "a.png", "image/png", headers).json()
    second = upload(client, inspection.id, make_image("JPEG"), "b.jpg", "image/jpeg", headers).json()
    listing = client.get(f"/api/inspections/{inspection.id}/evidence", headers=headers).json()
    assert [e["id"] for e in listing] == [first["id"], second["id"]]
    single = client.get(f"/api/inspections/{inspection.id}/evidence/{second['id']}", headers=headers)
    assert single.status_code == 200 and single.json()["original_filename"] == "b.jpg"
    assert client.get(f"/api/inspections/{inspection.id}/evidence/99999", headers=headers).status_code == 404


def test_processed_image_retrieval(setup):
    client, inspection, headers, _ = setup
    body = upload(client, inspection.id, make_image("PNG", (320, 200)), headers=headers).json()
    response = client.get(body["processed_url"], headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["x-content-type-options"] == "nosniff"
    image = Image.open(io.BytesIO(response.content))
    assert image.mode == "L" and image.size == (body["processed_width"], body["processed_height"])


def test_original_retrieval_returns_exact_bytes(setup):
    client, inspection, headers, _ = setup
    data = make_image("JPEG", (320, 200))
    body = upload(client, inspection.id, data, "p.jpg", "image/jpeg", headers).json()
    response = client.get(body["original_url"], headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == data


def test_missing_file_on_disk_gives_404_not_a_path(setup, db):
    client, inspection, headers, settings = setup
    body = upload(client, inspection.id, make_image("PNG"), headers=headers).json()
    row = db.scalar(select(ImageEvidence))
    (settings.originals_dir / row.stored_filename).unlink()
    response = client.get(body["original_url"], headers=headers)
    assert response.status_code == 404
    assert str(settings.upload_dir) not in response.text


# ---- preprocessing behaviour -----------------------------------------------------------------
def test_original_is_preserved_when_reprocessing(setup, db):
    client, inspection, headers, settings = setup
    data = make_image("PNG", (320, 200))
    body = upload(client, inspection.id, data, headers=headers).json()
    row = db.scalar(select(ImageEvidence))
    first_processed = settings.processed_dir / row.processed_stored_filename

    response = client.post(f"/api/inspections/{inspection.id}/evidence/{body['id']}/preprocess", headers=headers)
    assert response.status_code == 200 and response.json()["preprocessing_status"] == "completed"

    db.refresh(row)
    assert (settings.originals_dir / row.stored_filename).read_bytes() == data
    assert len(stored_files(settings.originals_dir)) == 1
    assert not first_processed.exists()  # superseded processed copy removed
    assert len(stored_files(settings.processed_dir)) == 1


def test_preprocessing_failure_keeps_upload_and_can_be_retried(setup, db, monkeypatch):
    client, inspection, headers, settings = setup

    def boom(*_args, **_kwargs):
        raise PreprocessingError("Preprocessing failed (simulated)")

    monkeypatch.setattr(evidence_service, "preprocess_image", boom)
    data = make_image("PNG", (320, 200))
    response = upload(client, inspection.id, data, headers=headers)
    assert response.status_code == 201  # the upload itself survives
    body = response.json()
    assert body["preprocessing_status"] == "failed"
    assert "simulated" in body["preprocessing_error"]
    assert body["processed_url"] is None

    row = db.scalar(select(ImageEvidence))
    assert (settings.originals_dir / row.stored_filename).read_bytes() == data
    assert client.get(f"/api/inspections/{inspection.id}/evidence/{body['id']}/processed", headers=headers).status_code == 404
    assert db.scalar(select(AuditEvent).where(AuditEvent.action == "evidence.preprocessing_failed")) is not None

    monkeypatch.undo()
    retry = client.post(f"/api/inspections/{inspection.id}/evidence/{body['id']}/preprocess", headers=headers)
    assert retry.json()["preprocessing_status"] == "completed"
    assert client.get(retry.json()["processed_url"], headers=headers).status_code == 200


# ---- audit events ----------------------------------------------------------------------------
def test_upload_and_preprocessing_are_audited(setup, db, owner):
    client, inspection, headers, _ = setup
    upload(client, inspection.id, make_image("PNG"), "secret-label-name.png", "image/png", headers)
    events = {e.action: e for e in db.scalars(select(AuditEvent).where(AuditEvent.inspection_id == inspection.id))}
    assert {"evidence.uploaded", "evidence.preprocessed"} <= set(events)
    for event in (events["evidence.uploaded"], events["evidence.preprocessed"]):
        assert event.user_id == owner.id
        assert "secret-label-name" not in str(event.details)  # client file names are never logged
        assert "Bearer" not in str(event.details)
    assert "steps" in events["evidence.preprocessed"].details


def test_rejected_uploads_are_audited_with_a_reason_only(setup, db):
    client, inspection, headers, _ = setup
    upload(client, inspection.id, b"not an image", "private-name.png", "image/png", headers)
    event = db.scalar(select(AuditEvent).where(AuditEvent.action == "evidence.upload_rejected"))
    assert event is not None
    assert event.details == {"reason": "invalid_content"}


# ---- Swagger / OpenAPI -----------------------------------------------------------------------
def test_openapi_documents_endpoints_and_auth(client):
    spec = client.get("/openapi.json").json()
    assert "HTTPBearer" in spec["components"]["securitySchemes"]
    base = "/api/inspections/{inspection_id}/evidence"
    expected = {
        "/api/inspections": ["post"],
        base: ["get", "post"],
        base + "/{evidence_id}": ["get"],
        base + "/{evidence_id}/processed": ["get"],
        base + "/{evidence_id}/original": ["get"],
        base + "/{evidence_id}/preprocess": ["post"],
    }
    for path, methods in expected.items():
        for method in methods:
            operation = spec["paths"][path][method]
            assert operation.get("security"), f"{method.upper()} {path} should show auth in Swagger"
            assert operation.get("summary")
    upload_op = spec["paths"][base]["post"]
    assert {"413", "415", "422"} <= set(upload_op["responses"])
