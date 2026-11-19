"""Pydantic schemas for compliance screening APIs."""

from pydantic import BaseModel, ConfigDict

from app.models.enums import OverallResult, RuleStatus


class ComplianceRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_version: str
    field_name: str | None = None
    status: RuleStatus
    explanation: str
    evidence_text: str | None = None


class ComplianceRunResponse(BaseModel):
    inspection_id: int
    overall_result: OverallResult
    rules: list[ComplianceRuleRead]
    potential_issues: list[ComplianceRuleRead]
    disclaimer: str


class ComplianceResultsResponse(ComplianceRunResponse):
    pass


class RuleDefinitionRead(BaseModel):
    rule_id: str
    name: str
    field_name: str
    description: str
    rule_version: str
    rule_type: str
    legal_verification: str