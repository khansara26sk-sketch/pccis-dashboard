
"""Importing this package registers every model on Base.metadata (needed by Alembic)."""

from app.models.audit_event import AuditEvent
from app.models.enums import (
    InspectionStatus,
    OCRStatus,
    OverallResult,
    PreprocessingStatus,
    ReviewDecision,
    ReviewStatus,
    RuleStatus,
    UserRole,
)
from app.models.extracted_field import ExtractedField
from app.models.image_evidence import ImageEvidence
from app.models.inspection import Inspection
from app.models.inspection_review import InspectionReview
from app.models.rule_result import RuleResult
from app.models.user import User

__all__ = [
    "AuditEvent",
    "ExtractedField",
    "ImageEvidence",
    "Inspection",
    "InspectionReview",
    "RuleResult",
    "User",
    "InspectionStatus",
    "OCRStatus",
    "OverallResult",
    "PreprocessingStatus",
    "ReviewDecision",
    "ReviewStatus",
    "RuleStatus",
    "UserRole",
]
