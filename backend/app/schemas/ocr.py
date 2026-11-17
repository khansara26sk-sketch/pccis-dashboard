from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OCRStatus


class OCRResultRead(BaseModel):
    """OCR result returned for an evidence image."""

    model_config = ConfigDict(from_attributes=True)

    evidence_id: int
    inspection_id: int
    status: OCRStatus
    error: str | None = None
    extracted_text: str | None = None
    confidence: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Average OCR confidence percentage",
    )