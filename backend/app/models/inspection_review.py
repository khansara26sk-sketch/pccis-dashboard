from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import ReviewDecision, enum_type
from app.models.mixins import utcnow


class InspectionReview(Base):
    __tablename__ = "inspection_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"),
        index=True,
    )

    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
    )

    decision: Mapped[ReviewDecision] = mapped_column(
        enum_type(ReviewDecision),
        nullable=False,
    )

    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=sa.func.now(),
    )