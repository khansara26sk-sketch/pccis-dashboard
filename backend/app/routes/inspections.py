from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.models.enums import InspectionStatus
from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.models import Inspection
from app.schemas.inspections import InspectionCreate, InspectionRead
from app.services import inspection_service

router = APIRouter(prefix="/inspections", tags=["inspections"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    response_model=InspectionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an inspection",
    description=(
        "Creates an empty draft inspection owned by the current user, so evidence images can be "
        "uploaded to it. Listing, filtering, editing and deleting inspections come in a later phase."
    ),
    responses={401: {"description": "Missing or invalid access token"}},
)
def create_inspection(payload: InspectionCreate, current_user: CurrentUser, db: DbSession) -> Inspection:
    return inspection_service.create_inspection(db, current_user, payload.product_name)

@router.get(
    "",
    response_model=list[InspectionRead],
    summary="List inspections",
)
def list_inspections(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    inspection_status: InspectionStatus | None = Query(default=None, alias="status"),
):
    return inspection_service.list_inspections(
        db,
        current_user,
        skip=skip,
        limit=limit,
        search=search,
        status=inspection_status.value if inspection_status else None,
    )


@router.get(
    "/{inspection_id}",
    response_model=InspectionRead,
    summary="Get inspection details",
)
def get_inspection(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    try:
        return inspection_service.get_accessible_inspection(
            db, current_user, inspection_id
        )
    except inspection_service.InspectionNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        )