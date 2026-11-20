
"""Pydantic schemas for inspection reports."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ReviewDecision
from app.schemas.compliance import ComplianceRuleRead
from app.schemas.evidence import EvidenceRead
from app.schemas.inspections import InspectionRead
from app.schemas.reviews import ReviewRead


class ExtractedFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inspection_id: int
    evidence_id: int | None
    field_name: str
    extracted_value: str | None
    confidence: float | None
    source_text: str | None
    manually_corrected: bool
    corrected_by: int | None
    created_at: datetime


class InspectionReportResponse(BaseModel):
    inspection: InspectionRead
    evidence: list[EvidenceRead]
    extracted_fields: list[ExtractedFieldRead]
    compliance_results: list[ComplianceRuleRead]
    reviews: list[ReviewRead]
    disclaimer: str
