
"""Service for retrieving OCR results associated with evidence."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExtractedField, ImageEvidence, OCRStatus

from app.services.field_extraction_service import get_field_status

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

def get_structured_fields(
    db: Session,
    *,
    evidence: ImageEvidence,
) -> dict:
    """Return structured product fields with review statuses."""

    field_names = [
        "product_name",
        "batch_number",
        "manufacturing_date",
        "expiry_date",
        "manufacturer",
        "address",
        "net_quantity",
        "mrp",
        "consumer_care",
        "country_of_origin",
    ]

    fields = {name: None for name in field_names}
    field_statuses = {
        name: "not_detected" for name in field_names
    }

    # Do not return stale values if OCR is pending or failed.
    if evidence.ocr_status != OCRStatus.COMPLETED:
        return {
            "evidence_id": evidence.id,
            "inspection_id": evidence.inspection_id,
            "status": evidence.ocr_status,
            "fields": fields,
            "field_statuses": field_statuses,
        }

    records = db.scalars(
        select(ExtractedField).where(
            ExtractedField.evidence_id == evidence.id,
            ExtractedField.field_name.in_(field_names),
        )
    ).all()

    field_confidences = {name: None for name in field_names}

    for record in records:
        name = record.field_name
        value = record.extracted_value

        fields[name] = value
        field_confidences[name] = record.confidence

        if record.manually_corrected:
            field_statuses[name] = (
                "verified" if value else "not_detected"
            )
        else:
            field_statuses[name] = get_field_status(name, value)

    return {
        "evidence_id": evidence.id,
        "inspection_id": evidence.inspection_id,
        "status": evidence.ocr_status,
        "fields": fields,
        "field_statuses": field_statuses,
        "field_confidences": field_confidences,
    }