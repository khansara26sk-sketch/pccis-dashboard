
"""OCR service for extracting text from preprocessed evidence images."""

from dataclasses import dataclass
from pathlib import Path

import pytesseract
from PIL import Image
from pytesseract import Output

from app.config import Settings


@dataclass(frozen=True)
class OCRResult:
    text: str
    confidence: float | None


class OCRProcessingError(Exception):
    """Raised when OCR cannot process an image."""


def extract_text(image_path: Path, settings: Settings) -> OCRResult:
    """Extract text and calculate average confidence from a processed image."""

    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")

            data = pytesseract.image_to_data(
                image,
                output_type=Output.DICT,
            )

        words = []
        confidences = []

        for word, raw_confidence in zip(
            data.get("text", []),
            data.get("conf", []),
        ):
            word = word.strip()

            if not word:
                continue

            try:
                confidence = float(raw_confidence)
            except (TypeError, ValueError):
                continue

            # Ignore invalid OCR confidence values and their words.
            if confidence < 0:
                continue

            words.append(word)
            confidences.append(confidence)

        text = " ".join(words).strip()

        average_confidence = (
            sum(confidences) / len(confidences)
            if confidences
            else None
        )

        return OCRResult(
            text=text,
            confidence=average_confidence,
        )

    except Exception as exc:
        raise OCRProcessingError(
            "OCR processing failed"
        ) from exc
