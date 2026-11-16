from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import RuleStatus, enum_type
from app.models.mixins import utcnow


class RuleResult(Base):
    __tablename__ = "rule_results"
    __table_args__ = (Index("ix_rule_results_inspection_rule", "inspection_id", "rule_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"))
    rule_id: Mapped[str] = mapped_column(String(64))
    rule_version: Mapped[str] = mapped_column(String(32))
    field_name: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[RuleStatus] = mapped_column(enum_type(RuleStatus), index=True)
    explanation: Mapped[str] = mapped_column(Text)
    evidence_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=sa.func.now()
    )

    inspection: Mapped["Inspection"] = relationship(back_populates="rule_results")  # noqa: F821
