
"""Enumerations shared by models. Values are what is stored in the database."""
import enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, enum.Enum):
    INSPECTOR = "Inspector"
    SENIOR_OFFICER = "Senior Officer"
    ADMIN = "Admin"


class InspectionStatus(str, enum.Enum):
    DRAFT = "draft"
    IMAGE_UPLOADED = "image_uploaded"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    FAILED = "failed"


class ReviewStatus(str, enum.Enum):
    NOT_REVIEWED = "not_reviewed"
    IN_REVIEW = "in_review"
    REVIEWED = "reviewed"


class OverallResult(str, enum.Enum):
    """Deliberately no 'non-compliant' value: the system flags, a human decides."""
    PASS = "Pass"
    POTENTIAL_ISSUE = "Potential Issue"
    MANUAL_REVIEW = "Manual Review"


class RuleStatus(str, enum.Enum):
    PASS = "Pass"
    POTENTIAL_ISSUE = "Potential Issue"
    NOT_DETECTED = "Not Detected"
    UNREADABLE = "Unreadable"
    NOT_APPLICABLE = "Not Applicable"
    MANUAL_REVIEW = "Manual Review"


class PreprocessingStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class OCRStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


def enum_type(enum_cls: type[enum.Enum]) -> SAEnum:
    """Store enum values in a plain VARCHAR (portable across SQLite/PostgreSQL)."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=32,
        values_callable=lambda e: [m.value for m in e],
        validate_strings=True,
    )
