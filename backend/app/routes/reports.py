
"""API routes for inspection reports."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.reports import InspectionReportResponse
from app.services.report_service import get_inspection_report
from app.services.review_service import (
    ReviewInspectionNotFound,
    ReviewPermissionError,
)

from app.services.dashboard_service import get_reports_analytics

from fastapi.responses import StreamingResponse

from app.services.pdf_report_service import generate_inspection_pdf

router = APIRouter(tags=["reports"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "/inspections/{inspection_id}/report",
    response_model=InspectionReportResponse,
    summary="Get inspection report",
)
def read_inspection_report(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> InspectionReportResponse:
    try:
        report = get_inspection_report(
            db,
            inspection_id=inspection_id,
            user=current_user,
        )
        return InspectionReportResponse.model_validate(report)

    except ReviewInspectionNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        ) from None

    except ReviewPermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from None


@router.get(
    "/inspections/{inspection_id}/report/pdf",
    summary="Download inspection report as PDF",
)
def download_inspection_report_pdf(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    try:
        report = get_inspection_report(
            db,
            inspection_id=inspection_id,
            user=current_user,
        )

        pdf_buffer = generate_inspection_pdf(report)

        inspection_number = report["inspection"].inspection_number

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{inspection_number}.pdf"'
                )
            },
        )

    except ReviewInspectionNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        ) from None

    except ReviewPermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from None

@router.get(
    "/reports",
    summary="Get inspection report analytics",
)
def read_reports_analytics(
    current_user: CurrentUser,
    db: DbSession,
    range: str = "Last 30 Days",
    category: str = "All",
):
    allowed_ranges = {
        "Last 7 Days",
        "Last 30 Days",
        "Current Quarter",
        "Year to Date",
    }

    if range not in allowed_ranges:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reporting period",
        )

    return get_reports_analytics(
        db,
        current_user,
        range,
        category,
    )
