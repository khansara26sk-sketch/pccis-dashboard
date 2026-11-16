from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OCRStatus, PreprocessingStatus


class EvidenceRead(BaseModel):
    """Evidence metadata. Server file names and paths are deliberately not included."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    inspection_id: int
    original_filename: str = Field(description="Sanitised client file name, for display only")
    content_type: str = Field(description="Detected from the file contents")
    file_size_bytes: int | None
    width: int | None
    height: int | None
    sha256: str | None = Field(description="SHA-256 of the original upload")
    uploaded_at: datetime
    preprocessing_status: PreprocessingStatus
    
    preprocessing_error: str | None
    ocr_status: OCRStatus
    ocr_error: str | None
    preprocessing_report: dict[str, Any] | None = Field(
        description="Which preprocessing steps were applied, and with what values"
    )
    processed_width: int | None
    processed_height: int | None
    processed_at: datetime | None
    original_url: str | None = None
    processed_url: str | None = Field(
        default=None, description="Null unless preprocessing completed"
    )
