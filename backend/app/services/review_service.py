
"""Business logic for inspection reviews."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Inspection,
    InspectionReview,
    ReviewDecision,
    ReviewStatus,
    User,
    UserRole,
)
from app.services.audit_service import record_event


class ReviewInspectionNotFound(Exception):
    """Raised when an inspection does not exist."""


class ReviewPermissionError(Exception):
    """Raised when a user is not allowed to review an inspection."""


def submit_review(
    db: Session,
    *,
    inspection_id: int,
    reviewer: User,
    decision: ReviewDecision,
    comments: str | None = None,
) -> InspectionReview:
    """Submit an authorized review and update inspection review status."""

    if reviewer.role not in (UserRole.SENIOR_OFFICER, UserRole.ADMIN):
        raise ReviewPermissionError("You are not authorized to submit reviews.")

    inspection = db.scalar(
        select(Inspection).where(Inspection.id == inspection_id)
    )

    if inspection is None:
        raise ReviewInspectionNotFound()

    if inspection.inspector_id == reviewer.id:
        raise ReviewPermissionError(
            "An inspector cannot review their own inspection."
        )

    review = InspectionReview(
        inspection_id=inspection.id,
        reviewer_id=reviewer.id,
        decision=decision,
        comments=comments,
    )

    db.add(review)

    inspection.review_status = ReviewStatus.REVIEWED

    record_event(
        db,
        user_id=reviewer.id,
        inspection_id=inspection.id,
        action="inspection.review_submitted",
        details={
            "decision": decision.value,
            "comments": comments,
        },
    )

    db.commit()
    db.refresh(review)

    return review


def get_inspection_reviews(
    db: Session,
    *,
    inspection_id: int,
    user: User,
) -> list[InspectionReview]:
    """Return review history to the inspection owner, reviewer roles, or Admin."""

    inspection = db.scalar(
        select(Inspection).where(Inspection.id == inspection_id)
    )

    if inspection is None:
        raise ReviewInspectionNotFound()

    can_view = (
        inspection.inspector_id == user.id
        or user.role in (UserRole.SENIOR_OFFICER, UserRole.ADMIN)
    )

    if not can_view:
        raise ReviewPermissionError(
            "You are not authorized to view these reviews."
        )

    statement = (
        select(InspectionReview)
        .where(InspectionReview.inspection_id == inspection_id)
        .order_by(InspectionReview.created_at.desc())
    )

    return list(db.scalars(statement).all())
