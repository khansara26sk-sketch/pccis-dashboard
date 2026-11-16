from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.services.dashboard_service import get_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return get_dashboard_stats(db, current_user)
