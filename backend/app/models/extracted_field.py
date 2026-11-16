from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import utcnow


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    __table_args__ = (
        Index(
            "ix_extracted_fields_inspection_field",
            "inspection_id",
            "field_name",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE")
    )

    # Image associated with this extraction (optional for old records).
    evidence_id: Mapped[int | None] = mapped_column(
        ForeignKey("image_evidence.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    field_name: Mapped[str] = mapped_column(String(64))

    extracted_value: Mapped[str | None] = mapped_column(Text)

    confidence: Mapped[float | None] = mapped_column(Float)

    source_text: Mapped[str | None] = mapped_column(Text)

    manually_corrected: Mapped[bool] = mapped_column(
        default=False,
        server_default=sa.false(),
    )

    corrected_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=sa.func.now(),
    )

    inspection: Mapped["Inspection"] = relationship(
        back_populates="extracted_fields"
    )

    evidence: Mapped["ImageEvidence | None"] = relationship(
        back_populates="extracted_fields"
    )