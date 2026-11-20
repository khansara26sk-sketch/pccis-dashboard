
"""Pydantic schemas for inspection review APIs."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ReviewDecision


class ReviewCreate(BaseModel):
    decision: ReviewDecision
    comments: str | None = Field(default=None, max_length=2000)

    @field_validator("comments")
    @classmethod
    def clean_comments(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inspection_id: int
    reviewer_id: int
    decision: ReviewDecision
    comments: str | None
    created_at: datetime


class ReviewListResponse(BaseModel):
    inspection_id: int
    review_status: str
    reviews: list[ReviewRead]
