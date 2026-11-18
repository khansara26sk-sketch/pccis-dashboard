
"""Evidence upload and preprocessing workflow: validate, store original, record, preprocess and OCR."""

from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.services.field_extraction_service import extract_product_fields
from app.config import Settings
from app.models import (
    ExtractedField,
    ImageEvidence,
    Inspection,
    InspectionStatus,
    OCRStatus,
    PreprocessingStatus,
    User,
)
from app.services.audit_service import record_event
from app.services.image_service import (
    InvalidImageContent,
    PreprocessingError,
    UnsupportedImageType,
    check_declared_type,
    preprocess_image,
    validate_image_bytes,
)
from app.services.ocr_service import OCRProcessingError, extract_text
from app.services.storage_service import (
    StorageError,
    delete_quietly,
    new_stored_filename,
    safe_join,
    write_new_file,
)
from app.utils.files import sanitize_display_filename

READ_CHUNK_BYTES = 1024 * 1024


class EvidenceNotFound(Exception):
    pass


class FileTooLarge(Exception):
    pass


class EvidenceLimitReached(Exception):
    pass


def read_limited(fileobj: BinaryIO, max_bytes: int) -> bytes:
    """Read an upload but stop as soon as it exceeds the limit."""
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = fileobj.read(READ_CHUNK_BYTES)
        if not chunk:
            break

        total += len(chunk)
        if total > max_bytes:
            raise FileTooLarge()

        chunks.append(chunk)

    return b"".join(chunks)


def get_evidence(
    db: Session,
    inspection: Inspection,
    evidence_id: int,
) -> ImageEvidence:
    evidence = db.scalar(
        select(ImageEvidence).where(
            ImageEvidence.id == evidence_id,
            ImageEvidence.inspection_id == inspection.id,
        )
    )

    if evidence is None:
        raise EvidenceNotFound()

    return evidence


def list_evidence(db: Session, inspection: Inspection) -> list[ImageEvidence]:
    return list(
        db.scalars(
            select(ImageEvidence)
            .where(ImageEvidence.inspection_id == inspection.id)
            .order_by(ImageEvidence.id)
        )
    )


def original_path(settings: Settings, evidence: ImageEvidence) -> Path:
    return safe_join(settings.originals_dir, evidence.stored_filename)


def processed_path(
    settings: Settings,
    evidence: ImageEvidence,
) -> Path | None:
    if evidence.preprocessing_status != PreprocessingStatus.COMPLETED:
        return None

    if not evidence.processed_stored_filename:
        return None

    return safe_join(
        settings.processed_dir,
        evidence.processed_stored_filename,
    )


def run_ocr(
    db: Session,
    *,
    settings: Settings,
    evidence: ImageEvidence,
    user: User,
    image_path: Path,
) -> None:
    """Extract text from the processed image and save its OCR result."""

    evidence.ocr_status = OCRStatus.PENDING
    evidence.ocr_error = None

    record_event(
        db,
        user_id=user.id,
        inspection_id=evidence.inspection_id,
        action="evidence.ocr_started",
        details={"evidence_id": evidence.id},
    )
    db.commit()

    try:
        result = extract_text(image_path, settings)
    except OCRProcessingError:
        evidence.ocr_status = OCRStatus.FAILED
        evidence.ocr_error = "OCR processing failed"

        record_event(
            db,
            user_id=user.id,
            inspection_id=evidence.inspection_id,
            action="evidence.ocr_failed",
            details={
                "evidence_id": evidence.id,
                "error": evidence.ocr_error,
            },
        )
        db.commit()
        return

    extracted_field = db.scalar(
        select(ExtractedField).where(
            ExtractedField.evidence_id == evidence.id,
            ExtractedField.field_name == "ocr_text",
        )
    )

    if extracted_field is None:
        extracted_field = ExtractedField(
            inspection_id=evidence.inspection_id,
            evidence_id=evidence.id,
            field_name="ocr_text",
        )
        db.add(extracted_field)

    extracted_field.extracted_value = result.text
    extracted_field.source_text = result.text
    extracted_field.confidence = result.confidence
    product_fields = extract_product_fields(result.text)

    structured_fields = {
        "product_name": product_fields.product_name,
        "batch_number": product_fields.batch_number,
        "manufacturing_date": product_fields.manufacturing_date,
        "expiry_date": product_fields.expiry_date,
    }

    for field_name, field_value in structured_fields.items():
        field_record = db.scalar(
            select(ExtractedField).where(
                ExtractedField.evidence_id == evidence.id,
                ExtractedField.field_name == field_name,
            )
        )

        if field_record is None:
            field_record = ExtractedField(
                inspection_id=evidence.inspection_id,
                evidence_id=evidence.id,
                field_name=field_name,
            )
            db.add(field_record)

        # Preserve manually corrected values.
        if field_record.manually_corrected:
            continue

        field_record.extracted_value = field_value
        field_record.source_text = result.text
        field_record.confidence = result.confidence

    evidence.ocr_status = OCRStatus.COMPLETED
    evidence.ocr_error = None

    record_event(
        db,
        user_id=user.id,
        inspection_id=evidence.inspection_id,
        action="evidence.ocr_completed",
        details={
            "evidence_id": evidence.id,
            "character_count": len(result.text),
            "confidence": result.confidence,
        },
    )

    db.commit()


def upload_evidence(
    db: Session,
    *,
    settings: Settings,
    inspection: Inspection,
    user: User,
    filename: str | None,
    content_type: str | None,
    fileobj: BinaryIO,
) -> ImageEvidence:
    def reject(reason: str, error: Exception):
        # Audit details carry only a reason code.
        record_event(
            db,
            user_id=user.id,
            inspection_id=inspection.id,
            action="evidence.upload_rejected",
            details={"reason": reason},
        )
        db.commit()
        raise error

    existing = db.scalar(
        select(func.count()).select_from(ImageEvidence).where(
            ImageEvidence.inspection_id == inspection.id
        )
    )

    if (existing or 0) >= settings.max_images_per_inspection:
        reject("limit_reached", EvidenceLimitReached())

    display_name = sanitize_display_filename(filename)

    try:
        declared_format = check_declared_type(
            display_name,
            content_type,
            settings.allowed_image_formats,
        )
    except UnsupportedImageType as exc:
        reject("unsupported_type", exc)

    try:
        data = read_limited(fileobj, settings.max_upload_size_bytes)
    except FileTooLarge as exc:
        reject("too_large", exc)

    try:
        info = validate_image_bytes(
            data,
            allowed_formats=settings.allowed_image_formats,
            max_pixels=settings.max_image_pixels,
            expected_format=declared_format,
        )
    except InvalidImageContent as exc:
        reject("invalid_content", exc)

    stored_name = new_stored_filename(info.stored_ext)

    stored_path = write_new_file(
        settings.originals_dir,
        stored_name,
        data,
    )

    evidence = ImageEvidence(
        inspection_id=inspection.id,
        original_filename=display_name,
        stored_filename=stored_name,
        file_path=f"originals/{stored_name}",
        content_type=info.mime,
        file_size_bytes=info.size_bytes,
        width=info.width,
        height=info.height,
        sha256=info.sha256,
        preprocessing_status=PreprocessingStatus.PENDING,
        ocr_status=OCRStatus.PENDING,
    )

    try:
        db.add(evidence)
        db.flush()

        record_event(
            db,
            user_id=user.id,
            inspection_id=inspection.id,
            action="evidence.uploaded",
            details={
                "evidence_id": evidence.id,
                "content_type": info.mime,
                "size_bytes": info.size_bytes,
                "sha256": info.sha256,
            },
        )

        if inspection.status == InspectionStatus.DRAFT:
            inspection.status = InspectionStatus.IMAGE_UPLOADED

        db.commit()

    except Exception:
        db.rollback()
        delete_quietly(stored_path)
        raise

    run_preprocessing(
        db,
        settings=settings,
        evidence=evidence,
        user=user,
    )

    return evidence


def run_preprocessing(
    db: Session,
    *,
    settings: Settings,
    evidence: ImageEvidence,
    user: User,
) -> ImageEvidence:
    """Rebuild the processed copy and run OCR without modifying the original."""

    old_processed = (
        safe_join(settings.processed_dir, evidence.processed_stored_filename)
        if evidence.processed_stored_filename
        else None
    )

    new_path: Path | None = None

    try:
        data = original_path(settings, evidence).read_bytes()
        result = preprocess_image(data, settings.preprocessing)

        new_name = new_stored_filename("png")
        new_path = write_new_file(
            settings.processed_dir,
            new_name,
            result.png_bytes,
        )

    except PreprocessingError as exc:
        error = str(exc)

    except (OSError, StorageError):
        error = "Preprocessing failed (could not read or write image files)"

    else:
        evidence.preprocessing_status = PreprocessingStatus.COMPLETED
        evidence.preprocessing_error = None
        evidence.preprocessing_report = result.report
        evidence.processed_stored_filename = new_name
        evidence.processed_width = result.width
        evidence.processed_height = result.height
        evidence.processed_at = datetime.now(timezone.utc)

        record_event(
            db,
            user_id=user.id,
            inspection_id=evidence.inspection_id,
            action="evidence.preprocessed",
            details={
                "evidence_id": evidence.id,
                "steps": result.report.get("steps", []),
                "width": result.width,
                "height": result.height,
            },
        )

        db.commit()

        if old_processed is not None and old_processed != new_path:
            delete_quietly(old_processed)

        # OCR always reads the newly generated processed image.
        run_ocr(
            db,
            settings=settings,
            evidence=evidence,
            user=user,
            image_path=new_path,
        )

        return evidence

    evidence.preprocessing_status = PreprocessingStatus.FAILED
    evidence.preprocessing_error = error[:300]
    evidence.preprocessing_report = None
    evidence.processed_stored_filename = None
    evidence.processed_width = None
    evidence.processed_height = None
    evidence.processed_at = None

    evidence.ocr_status = OCRStatus.FAILED
    evidence.ocr_error = "OCR unavailable because preprocessing failed"

    record_event(
        db,
        user_id=user.id,
        inspection_id=evidence.inspection_id,
        action="evidence.preprocessing_failed",
        details={
            "evidence_id": evidence.id,
            "error": evidence.preprocessing_error,
        },
    )

    record_event(
        db,
        user_id=user.id,
        inspection_id=evidence.inspection_id,
        action="evidence.ocr_failed",
        details={
            "evidence_id": evidence.id,
            "error": evidence.ocr_error,
        },
    )

    db.commit()
    delete_quietly(old_processed)

    return evidence
