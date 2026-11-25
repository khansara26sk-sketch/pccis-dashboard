
"""OCR service for extracting text from preprocessed evidence images."""

from dataclasses import dataclass, field
from pathlib import Path
import json
import subprocess

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


def _build_ocr_variants(image: Image.Image) -> list[np.ndarray]:
    """Generate enhanced and rotated image variants for OCR."""

    rgb = np.array(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    # Upscale small printed text.
    enlarged = cv2.resize(
        gray,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC,
    )

    # Improve local contrast.
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    ).apply(enlarged)

    # Reduce minor image noise.
    denoised = cv2.fastNlMeansDenoising(
        clahe,
        None,
        h=10,
        templateWindowSize=7,
        searchWindowSize=21,
    )

    # Sharpen text edges.
    sharpened = cv2.addWeighted(
        denoised,
        1.5,
        cv2.GaussianBlur(denoised, (0, 0), 2),
        -0.5,
        0,
    )

    adaptive = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )

    otsu = cv2.threshold(
        denoised,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )[1]

    variants = [
        rgb,
        enlarged,
        denoised,
        sharpened,
        adaptive,
        otsu,
    ]

    # Test other orientations because packaging text may be rotated.
    for angle in (90, 180, 270):
        rotated = cv2.rotate(
            denoised,
            {
                90: cv2.ROTATE_90_CLOCKWISE,
                180: cv2.ROTATE_180,
                270: cv2.ROTATE_90_COUNTERCLOCKWISE,
            }[angle],
        )
        variants.append(rotated)

    return variants

def _run_paddle_ocr(image_path: Path) -> OCRCandidate:
    """Run PaddleOCR in its isolated Python 3.12 environment."""

    backend_dir = Path(__file__).resolve().parents[2]
    worker_path = Path(__file__).with_name("paddle_ocr_worker.py")
    paddle_python = backend_dir / ".venv-paddle" / "Scripts" / "python.exe"

    if not paddle_python.exists():
        raise OCRProcessingError("PaddleOCR environment not found")

    process = subprocess.run(
        [
            str(paddle_python),
            str(worker_path),
            str(image_path.resolve()),
        ],
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    if process.returncode != 0:
        raise OCRProcessingError(
            process.stderr.strip() or "PaddleOCR execution failed"
        )

    result_line = next(
        (
            line for line in reversed(process.stdout.splitlines())
            if line.startswith("PCCIS_OCR_RESULT:")
        ),
        None,
    )

    if result_line is None:
        raise OCRProcessingError("PaddleOCR returned no result")

    data = json.loads(result_line.split(":", 1)[1])

    return OCRCandidate(
        text=data.get("text", ""),
        confidence=(
            float(data["confidence"])
            if data.get("confidence") is not None
            else None
        ),
    )


def _read_candidate(
    image: np.ndarray,
    config: str,
) -> OCRCandidate:
    """Extract text and calculate average word confidence."""

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

    return OCRCandidate(
        text=text,
        confidence=confidence,
    )


def _candidate_score(candidate: OCRCandidate) -> float:
    """Rank candidates while avoiding preference for tiny text fragments."""

    if candidate.confidence is None:
        return -1

    word_count = len(candidate.text.split())

    # Small bonus for candidates containing more recognized words.
    coverage_bonus = min(word_count, 20) * 0.25

    return candidate.confidence + coverage_bonus



def extract_text(image_path: Path, settings: Settings) -> OCRResult:
    """Try PaddleOCR first, then fall back to Tesseract."""

    # 1. Try PaddleOCR.
    try:
        paddle_candidate = _run_paddle_ocr(image_path)

        if paddle_candidate.text:
            confidence = (
                paddle_candidate.confidence * 100
                if paddle_candidate.confidence is not None
                else None
            )

            return OCRResult(
                text=paddle_candidate.text,
                confidence=confidence,
                candidates=(paddle_candidate.text,),
                candidate_results=(
                    OCRCandidate(
                        text=paddle_candidate.text,
                        confidence=confidence,
                    ),
                ),
            )

    except Exception as exc:
        print(f"PADDLEOCR ERROR: {exc}", flush=True)

    # 2. Tesseract fallback.
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            variants = _build_ocr_variants(image)

        configurations = [
            "--oem 1 --psm 11",
            "--oem 1 --psm 6",
            "--oem 1 --psm 4",
            "--oem 1 --psm 12",
        ]

        results = []

        for variant in variants:
            for config in configurations:
                candidate = _read_candidate(variant, config)

                if candidate.text:
                    results.append(candidate)

        valid_results = [
            result for result in results
            if result.confidence is not None
        ]

        if not valid_results:
            return OCRResult("", None)

        best_result = max(
            valid_results,
            key=_candidate_score,
        )

        return OCRResult(
            text=best_result.text,
            confidence=best_result.confidence,
            candidates=tuple(result.text for result in results),
            candidate_results=tuple(results),
        )

    except Exception as exc:
        raise OCRProcessingError(
            "OCR processing failed"
        ) from exc
