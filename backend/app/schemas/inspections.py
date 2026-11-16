
from datetime import datetime

from pydantic import (
    AliasPath,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from app.models.enums import InspectionStatus, OverallResult, ReviewStatus


class InspectionCreate(BaseModel):
    product_name: str | None = Field(
        default=None,
        max_length=255,
        description="Optional product name; can be filled in later.",
    )

    @field_validator("product_name")
    @classmethod
    def _clean(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.split())
        return cleaned or None


class InspectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inspection_number: str
    product_name: str | None
    inspector_id: int

    # Read the inspector's name through the Inspection relationship.
    inspector_name: str = Field(
        validation_alias=AliasPath("inspector", "full_name")
    )

    inspection_date: datetime
    status: InspectionStatus
    review_status: ReviewStatus
    overall_result: OverallResult | None
    created_at: datetime
