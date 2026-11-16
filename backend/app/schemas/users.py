from pydantic import BaseModel

from app.models.enums import UserRole
from app.schemas.auth import UserRead


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserListResponse(BaseModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int
