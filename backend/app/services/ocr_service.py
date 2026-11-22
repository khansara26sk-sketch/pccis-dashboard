
"""OCR service for extracting text from preprocessed evidence images."""

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pytesseract import Output

from app.config import Settings


@dataclass(frozen=True)
class OCRCandidate:
    text: str
    confidence: float | None


@dataclass(frozen=True)
class OCRResult:
    text: str
    confidence: float | None
    candidates: tuple[str, ...] = field(
        default=(),
        compare=False,
        repr=False,
    )
    candidate_results: tuple[OCRCandidate, ...] = field(
        default=(),
        compare=False,
        repr=False,
    )


class OCRProcessingError(Exception):
    """Raised when OCR cannot process an image."""


def extract_text(image_path: Path, settings: Settings) -> OCRResult:
    """Extract text using multiple Tesseract configurations."""

    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")

            configurations = [
                "--oem 1 --psm 11",
                "--oem 1 --psm 6",
                "--oem 1 --psm 4",
            ]

            results = []

            for config in configurations:
                data = pytesseract.image_to_data(
                    image,
                    lang="eng",
                    config=config,
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

                    if confidence < 0:
                        continue

                    words.append(word)
                    confidences.append(confidence)

                text = " ".join(words).strip()

                confidence = (
                    sum(confidences) / len(confidences)
                    if confidences else None
                )

                results.append(
    OCRCandidate(
        text=text,
        confidence=confidence,
    )
)

                print(
                    f"\nOCR CONFIG: {config}"
                    f"\nTEXT: {text}"
                    f"\nCONFIDENCE: {confidence}"
                )

        valid_results = [
            result for result in results
            if result.confidence is not None
        ]

        if not valid_results:
            return OCRResult("", None)

        best_result = max(
            valid_results,
            key=lambda result: result.confidence,
        )

        all_texts = tuple(
            result.text for result in results
            if result.text
        )

        candidate_results = tuple(
            result for result in results
            if result.text
        )

        return OCRResult(
            text=best_result.text,
            confidence=best_result.confidence,
            candidates=all_texts,
            candidate_results=candidate_results,
        )

    except Exception as exc:
        raise OCRProcessingError(
            "OCR processing failed"
        ) from exc

