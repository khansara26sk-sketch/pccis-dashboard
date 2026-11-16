import sqlalchemy as sa
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import UserRole, enum_type
from app.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    # Null for Google-only accounts.
    hashed_password: Mapped[str | None] = mapped_column(String(255))
    google_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        enum_type(UserRole), default=UserRole.INSPECTOR, server_default=UserRole.INSPECTOR.value
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true())

    inspections: Mapped[list["Inspection"]] = relationship(back_populates="inspector")  # noqa: F821
