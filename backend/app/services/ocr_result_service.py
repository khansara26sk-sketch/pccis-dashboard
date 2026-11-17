
"""Service for retrieving OCR results associated with evidence."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExtractedField, ImageEvidence, OCRStatus


def get_ocr_result(
    db: Session,
    *,
    evidence: ImageEvidence,
) -> dict:
    """Return OCR status, extracted text and confidence for evidence."""

    extracted_field = db.scalar(
        select(ExtractedField).where(
            ExtractedField.evidence_id == evidence.id,
            ExtractedField.field_name == "ocr_text",
        )
    )

    # Never expose an old OCR result when the latest OCR run failed
    # or is still pending.
    is_completed = evidence.ocr_status == OCRStatus.COMPLETED

    return {
        "evidence_id": evidence.id,
        "inspection_id": evidence.inspection_id,
        "status": evidence.ocr_status,
        "error": evidence.ocr_error,
        "extracted_text": (
            extracted_field.extracted_value
            if is_completed and extracted_field
            else None
        ),
        "confidence": (
            extracted_field.confidence
            if is_completed and extracted_field
            else None
        ),
    }
