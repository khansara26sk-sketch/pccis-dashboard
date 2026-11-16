from datetime import datetime
from typing import Literal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.models.enums import UserRole
from app.utils.validators import (
    MAX_PASSWORD_LENGTH,
    normalize_full_name,
    validate_password_strength,
)


class RegisterRequest(BaseModel):
    """Public signup. There is no role field: any `role` sent by a client is ignored and the
    account is always created as Inspector."""

    full_name: str = Field(min_length=1, max_length=300)
    email: EmailStr
    password: str = Field(max_length=MAX_PASSWORD_LENGTH)
    confirm_password: str | None = Field(default=None, max_length=MAX_PASSWORD_LENGTH)

    @field_validator("full_name")
    @classmethod
    def _clean_name(cls, value: str) -> str:
        return normalize_full_name(value)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def _passwords_match(self) -> "RegisterRequest":
        if self.confirm_password is not None and self.confirm_password != self.password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


class GoogleLoginRequest(BaseModel):
    """Only the signed ID token is accepted. Identity (Google ID, email, name) is read from the
    token after backend verification, never from other fields in the request."""

    credential: str = Field(
        min_length=1, max_length=8192, validation_alias=AliasChoices("credential", "id_token")
    )


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserRead
