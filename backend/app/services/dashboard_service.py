from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Inspection, UserRole
from app.models.enums import OverallResult, ReviewStatus


def get_dashboard_stats(db: Session, user):
    # Admin can see all inspections; other users see only their own.
    filters = []

    if user.role != UserRole.ADMIN:
        filters.append(Inspection.inspector_id == user.id)

    def count_records(*extra_filters):
        statement = (
            select(func.count(Inspection.id))
            .where(*filters, *extra_filters)
        )
        return db.scalar(statement) or 0

    # Today's date is calculated using India Standard Time.
    local_tz = ZoneInfo("Asia/Kolkata")
    today = datetime.now(local_tz).date()
    tomorrow = today + timedelta(days=1)

    start_utc = datetime.combine(
        today, time.min, tzinfo=local_tz
    ).astimezone(timezone.utc).replace(tzinfo=None)

    end_utc = datetime.combine(
        tomorrow, time.min, tzinfo=local_tz
    ).astimezone(timezone.utc).replace(tzinfo=None)

    total_inspections = count_records()

    inspections_today = count_records(
        Inspection.inspection_date >= start_utc,
        Inspection.inspection_date < end_utc,
    )

    potential_issues = count_records(
        Inspection.overall_result == OverallResult.POTENTIAL_ISSUE
    )

    pending_reviews = count_records(
        Inspection.review_status != ReviewStatus.REVIEWED
    )

    return {
        "totalInspections": total_inspections,
        "inspectionsToday": inspections_today,
        "potentialIssues": potential_issues,
        "pendingReviews": pending_reviews,
    }
