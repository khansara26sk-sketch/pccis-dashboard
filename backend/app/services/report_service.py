
"""Service for generating inspection report data."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ExtractedField,
    ImageEvidence,
    Inspection,
    InspectionReview,
    RuleResult,
    User,
    UserRole,
)
from app.services.review_service import (
    ReviewInspectionNotFound,
    ReviewPermissionError,
)


REPORT_DISCLAIMER = (
    "These are automated declaration-presence screening results only. "
    "They do not establish statutory compliance or a legal violation. "
    "Final verification must be performed by an authorized officer."
)


def get_inspection_report(
    db: Session,
    *,
    inspection_id: int,
    user: User,
) -> dict:
    """Collect inspection, evidence, extraction, compliance and review data."""

    inspection = db.scalar(
        select(Inspection)
        .options(selectinload(Inspection.inspector))
        .where(Inspection.id == inspection_id)
    )

    if inspection is None:
        raise ReviewInspectionNotFound()

    can_view = (
        inspection.inspector_id == user.id
        or user.role in (UserRole.SENIOR_OFFICER, UserRole.ADMIN)
    )

    if not can_view:
        raise ReviewPermissionError(
            "You are not authorized to view this inspection report."
        )

    evidence = list(
        db.scalars(
            select(ImageEvidence)
            .where(ImageEvidence.inspection_id == inspection_id)
            .order_by(ImageEvidence.uploaded_at.desc())
        ).all()
    )

    extracted_fields = list(
        db.scalars(
            select(ExtractedField)
            .where(ExtractedField.inspection_id == inspection_id)
            .order_by(ExtractedField.created_at.desc())
        ).all()
    )

    rule_results = list(
        db.scalars(
            select(RuleResult)
            .where(RuleResult.inspection_id == inspection_id)
            .order_by(RuleResult.rule_id)
        ).all()
    )

    reviews = list(
        db.scalars(
            select(InspectionReview)
            .where(InspectionReview.inspection_id == inspection_id)
            .order_by(InspectionReview.created_at.desc())
        ).all()
    )

    return {
        "inspection": inspection,
        "evidence": evidence,
        "extracted_fields": extracted_fields,
        "compliance_results": rule_results,
        "reviews": reviews,
        "disclaimer": REPORT_DISCLAIMER,
    }
