from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import InspectionStatus, OverallResult, ReviewStatus, enum_type
from app.models.mixins import TimestampMixin, utcnow


class Inspection(TimestampMixin, Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    product_name: Mapped[str | None] = mapped_column(String(255))
    inspector_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    inspection_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    status: Mapped[InspectionStatus] = mapped_column(
        enum_type(InspectionStatus),
        default=InspectionStatus.DRAFT,
        server_default=InspectionStatus.DRAFT.value,
        index=True,
    )
    review_status: Mapped[ReviewStatus] = mapped_column(
        enum_type(ReviewStatus),
        default=ReviewStatus.NOT_REVIEWED,
        server_default=ReviewStatus.NOT_REVIEWED.value,
        index=True,
    )
    # Null until analysis has run.
    overall_result: Mapped[OverallResult | None] = mapped_column(
        enum_type(OverallResult), index=True
    )

    inspector: Mapped["User"] = relationship(back_populates="inspections")  # noqa: F821
    images: Mapped[list["ImageEvidence"]] = relationship(  # noqa: F821
        back_populates="inspection", cascade="all, delete-orphan", passive_deletes=True
    )
    extracted_fields: Mapped[list["ExtractedField"]] = relationship(  # noqa: F821
        back_populates="inspection", cascade="all, delete-orphan", passive_deletes=True
    )
    rule_results: Mapped[list["RuleResult"]] = relationship(  # noqa: F821
        back_populates="inspection", cascade="all, delete-orphan", passive_deletes=True
    )
    # Audit history is intentionally NOT cascaded: the database sets inspection_id to NULL
    # on delete so the trail of who did what survives.
    audit_events: Mapped[list["AuditEvent"]] = relationship(  # noqa: F821
        back_populates="inspection", passive_deletes=True
    )
