
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import OCRStatus, PreprocessingStatus, enum_type
from app.models.mixins import utcnow


class ImageEvidence(Base):
    __tablename__ = "image_evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), index=True
    )
    original_filename: Mapped[str] = mapped_column(
        String(255)
    )  # display only, never trusted
    stored_filename: Mapped[str] = mapped_column(String(255), unique=True)

    # Relative reference ("originals/<stored_filename>").
    # Real paths are built from settings.
    file_path: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(
        String(100)
    )  # detected from content, not the client
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Metadata of the untouched original
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    sha256: Mapped[str | None] = mapped_column(String(64))

    # Separately stored processed copy
    preprocessing_status: Mapped[PreprocessingStatus] = mapped_column(
        enum_type(PreprocessingStatus),
        default=PreprocessingStatus.PENDING,
        server_default=PreprocessingStatus.PENDING.value,
    )
    preprocessing_error: Mapped[str | None] = mapped_column(Text)
    preprocessing_report: Mapped[dict | None] = mapped_column(JSON)
    processed_stored_filename: Mapped[str | None] = mapped_column(
        String(255), unique=True
    )
    processed_width: Mapped[int | None] = mapped_column(Integer)
    processed_height: Mapped[int | None] = mapped_column(Integer)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # OCR processing status and error details
    ocr_status: Mapped[OCRStatus] = mapped_column(
        enum_type(OCRStatus),
        default=OCRStatus.PENDING,
        server_default=OCRStatus.PENDING.value,
    )
    ocr_error: Mapped[str | None] = mapped_column(Text)

    inspection: Mapped["Inspection"] = relationship(back_populates="images")  # noqa: F821
    extracted_fields: Mapped[list["ExtractedField"]] = relationship(
        back_populates="evidence"
    )
