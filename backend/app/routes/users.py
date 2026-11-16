from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models import User
from app.schemas.auth import UserRead
from app.schemas.users import UserListResponse, UserRoleUpdate
from app.services.audit_service import record_event

router = APIRouter(prefix="/users", tags=["users"])
DbSession = Annotated[Session, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_admin)]


@router.get("", response_model=UserListResponse)
def list_users(
    _admin: AdminUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> UserListResponse:
    total = db.scalar(select(func.count()).select_from(User)) or 0
    users = db.scalars(
        select(User).order_by(User.id).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return UserListResponse(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{user_id}/role", response_model=UserRead)
def change_role(user_id: int, payload: UserRoleUpdate, admin: AdminUser, db: DbSession) -> User:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot change your own role")
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    previous = target.role
    target.role = payload.role
    record_event(
        db,
        user_id=admin.id,
        action="user.role_changed",
        details={"target_user_id": target.id, "from": previous.value, "to": payload.role.value},
    )
    db.commit()
    return target
