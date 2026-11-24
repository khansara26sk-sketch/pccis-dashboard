from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Inspection, UserRole
from app.models.enums import OverallResult, ReviewStatus


def get_dashboard_stats(db: Session, user):
    # Admin and Senior Officer can see all inspections; Inspectors see only their own.
    filters = []

    if user.role not in (UserRole.SENIOR_OFFICER, UserRole.ADMIN):
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


def get_reports_analytics(db: Session, user, range_label: str, category: str):
    """Build report analytics from saved inspection screening results."""

    local_tz = ZoneInfo("Asia/Kolkata")
    today = datetime.now(local_tz).date()

    if range_label == "Last 7 Days":
        start_date = today - timedelta(days=6)
    elif range_label == "Current Quarter":
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start_date = today.replace(month=quarter_start_month, day=1)
    elif range_label == "Year to Date":
        start_date = today.replace(month=1, day=1)
    else:
        start_date = today - timedelta(days=29)

    end_date = today + timedelta(days=1)

    start_utc = datetime.combine(
        start_date, time.min, tzinfo=local_tz
    ).astimezone(timezone.utc).replace(tzinfo=None)

    end_utc = datetime.combine(
        end_date, time.min, tzinfo=local_tz
    ).astimezone(timezone.utc).replace(tzinfo=None)

    filters = [
        Inspection.inspection_date >= start_utc,
        Inspection.inspection_date < end_utc,
        Inspection.overall_result.is_not(None),
    ]

    if user.role not in (UserRole.SENIOR_OFFICER, UserRole.ADMIN):
        filters.append(Inspection.inspector_id == user.id)

    statement = (
        select(Inspection)
        .where(*filters)
        .order_by(Inspection.inspection_date)
    )

    records = db.scalars(statement).all()

    pass_count = sum(
        1 for item in records
        if item.overall_result == OverallResult.PASS
    )

    issue_count = sum(
        1 for item in records
        if item.overall_result == OverallResult.POTENTIAL_ISSUE
    )

    manual_count = sum(
        1 for item in records
        if item.overall_result == OverallResult.MANUAL_REVIEW
    )

    total = len(records)

    daily_counts = {}

    current_date = start_date
    while current_date < end_date:
        daily_counts[current_date] = {
            "date": current_date.strftime("%b %d"),
            "inspections": 0,
            "compliant": 0,
            "issues": 0,
        }
        current_date += timedelta(days=1)

    for item in records:
        record_date = item.inspection_date.date()

        if record_date in daily_counts:
            daily_counts[record_date]["inspections"] += 1

            if item.overall_result == OverallResult.PASS:
                daily_counts[record_date]["compliant"] += 1
            elif item.overall_result == OverallResult.POTENTIAL_ISSUE:
                daily_counts[record_date]["issues"] += 1

    screening_rate = (
        round((pass_count / total) * 100, 1)
        if total else 0
    )

    return {
        "summary": {
            "totalAudited": total,
            "complianceRate": f"{screening_rate}%",
            "criticalInfractions": issue_count,
            "potentialIssueCount": issue_count,
            "manualReviewCount": manual_count,
            "avgInspectionTime": None,
            "penaltiesRecommended": None,
        },
        "trends": list(daily_counts.values()),
        "statusBreakdown": [
            {
                "name": "Pass",
                "value": pass_count,
                "color": "#16A34A",
            },
            {
                "name": "Potential Issue",
                "value": issue_count,
                "color": "#DC2626",
            },
            {
                "name": "Manual Review",
                "value": manual_count,
                "color": "#D97706",
            },
        ],
        "categories": [
            {
                "category": "Uncategorized",
                "inspected": total,
                "violations": issue_count,
            }
        ],
        "categoryFilterSupported": False,
    }

