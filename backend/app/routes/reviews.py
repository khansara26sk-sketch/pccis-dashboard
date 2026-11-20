
"""API routes for inspection reviews."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.models import Inspection
from app.schemas.reviews import (
    ReviewCreate,
    ReviewListResponse,
    ReviewRead,
)
from app.services.review_service import (
    ReviewInspectionNotFound,
    ReviewPermissionError,
    get_inspection_reviews,
    submit_review,
)

router = APIRouter(tags=["reviews"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/inspections/{inspection_id}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an inspection review",
)
def create_inspection_review(
    inspection_id: int,
    payload: ReviewCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewRead:
    try:
        return submit_review(
            db,
            inspection_id=inspection_id,
            reviewer=current_user,
            decision=payload.decision,
            comments=payload.comments,
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
    "/inspections/{inspection_id}/reviews",
    response_model=ReviewListResponse,
    summary="Get inspection review history",
)
def read_inspection_reviews(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> ReviewListResponse:
    try:
        reviews = get_inspection_reviews(
            db,
            inspection_id=inspection_id,
            user=current_user,
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

    inspection = db.get(Inspection, inspection_id)

    return ReviewListResponse(
        inspection_id=inspection_id,
        review_status=inspection.review_status.value,
        reviews=reviews,
    )
