"""Image validation and preprocessing.

Pure functions: no database, no web framework. Nothing here writes files; callers decide where
bytes go. The original upload is never modified, preprocessing works on a decoded copy.
"""
import hashlib
import io
import os
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.config import PreprocessingSettings


class ImageError(Exception):
    pass


class UnsupportedImageType(ImageError):
    """Declared file extension or MIME type is not allowed."""


class InvalidImageContent(ImageError):
    """The bytes are not a valid image of an allowed format."""


class PreprocessingError(ImageError):
    """Preprocessing failed; the message is safe to show to API clients."""


@dataclass(frozen=True)
class FormatInfo:
    mime: str
    extensions: tuple[str, ...]
    stored_ext: str


FORMAT_INFO: dict[str, FormatInfo] = {
    "jpeg": FormatInfo("image/jpeg", (".jpg", ".jpeg"), "jpg"),
    "png": FormatInfo("image/png", (".png",), "png"),
    "webp": FormatInfo("image/webp", (".webp",), "webp"),
}
MIME_ALIASES = {"image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg", "image/x-png": "image/png"}


@dataclass(frozen=True)
class ValidatedImage:
    format: str
    mime: str
    stored_ext: str
    width: int
    height: int
    size_bytes: int
    sha256: str


@dataclass(frozen=True)
class PreprocessResult:
    png_bytes: bytes
    width: int
    height: int
    report: dict[str, Any]


# ---- validation ------------------------------------------------------------------------------
def check_declared_type(filename: str, content_type: str | None, allowed_formats: tuple[str, ...]) -> str:
    """Check the client-declared extension and MIME type. Returns the format key implied by the
    extension. This is only the first gate; the actual bytes are checked by validate_image_bytes."""
    extension = os.path.splitext(filename)[1].lower()
    fmt = next(
        (f for f in allowed_formats if extension in FORMAT_INFO[f].extensions),
        None,
    )
    if fmt is None:
        raise UnsupportedImageType("File extension is not allowed")

    declared = (content_type or "").split(";")[0].strip().lower()
    declared = MIME_ALIASES.get(declared, declared)
    if declared != FORMAT_INFO[fmt].mime:
        raise UnsupportedImageType("MIME type is missing, not allowed, or does not match the extension")
    return fmt


def validate_image_bytes(
    data: bytes,
    *,
    allowed_formats: tuple[str, ...],
    max_pixels: int,
    expected_format: str | None = None,
) -> ValidatedImage:
    """Decode the bytes fully and confirm they really are an allowed image."""
    if not data:
        raise InvalidImageContent("File is empty")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = (probe.format or "").lower()
            width, height = probe.size
            if fmt not in allowed_formats:
                raise InvalidImageContent("File content is not an allowed image format")
            if expected_format is not None and fmt != expected_format:
                raise InvalidImageContent("File content does not match its extension")
            if width < 1 or height < 1 or width * height > max_pixels:
                raise InvalidImageContent("Image dimensions are outside the allowed range")
            probe.verify()  # structural check
        with Image.open(io.BytesIO(data)) as full:
            full.load()  # full decode: catches truncated and corrupted data
    except InvalidImageContent:
        raise
    except Exception as exc:  # Pillow/zlib/struct raise many types on hostile input
        raise InvalidImageContent("File is not a valid image") from exc

    info = FORMAT_INFO[fmt]
    return ValidatedImage(
        format=fmt,
        mime=info.mime,
        stored_ext=info.stored_ext,
        width=width,
        height=height,
        size_bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
    )


# ---- preprocessing ---------------------------------------------------------------------------
def preprocess_image(data: bytes, cfg: PreprocessingSettings) -> PreprocessResult:
    """Produce a processed grayscale PNG for later OCR. Never touches the input bytes."""
    try:
        return _preprocess(data, cfg)
    except PreprocessingError:
        raise
    except Exception as exc:
        raise PreprocessingError(f"Preprocessing failed ({type(exc).__name__})") from exc


def _preprocess(data: bytes, cfg: PreprocessingSettings) -> PreprocessResult:
    steps: list[str] = []
    report: dict[str, Any] = {}

    with Image.open(io.BytesIO(data)) as source:
        orientation = source.getexif().get(0x0112, 1)
        oriented = ImageOps.exif_transpose(source)  # a corrected copy; source is untouched
        oriented.load()
    report["exif_orientation_applied"] = orientation not in (None, 1)
    if report["exif_orientation_applied"]:
        steps.append("orientation")

    img = cv2.cvtColor(np.asarray(_to_rgb(oriented)), cv2.COLOR_RGB2BGR)
    height, width = img.shape[:2]
    report["oriented_size"] = [width, height]

    # Resize (shrink only, aspect ratio preserved)
    longest = max(width, height)
    if longest > cfg.max_dimension:
        scale = cfg.max_dimension / longest
        new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        img = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
        steps.append("resize")
        report["resize_scale"] = round(scale, 4)
    report["resized"] = "resize" in steps

    is_gray = False
    if cfg.grayscale:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        is_gray = True
        steps.append("grayscale")

    if cfg.denoise and cfg.denoise_strength > 0:
        if is_gray:
            img = cv2.fastNlMeansDenoising(img, None, cfg.denoise_strength, 7, 21)
        else:
            img = cv2.fastNlMeansDenoisingColored(
                img, None, cfg.denoise_strength, cfg.denoise_strength, 7, 21
            )
        steps.append("denoise")

    report["deskew_angle"] = None
    if cfg.deskew:
        gray = img if is_gray else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        angle = estimate_skew_angle(
            gray, cfg.deskew_max_angle, cfg.deskew_min_angle, cfg.deskew_min_improvement
        )
        if angle != 0.0:
            img = rotate_keep_content(img, angle)
            steps.append("deskew")
            report["deskew_angle"] = round(angle, 2)

    if cfg.contrast:
        clahe = cv2.createCLAHE(
            clipLimit=cfg.clahe_clip_limit, tileGridSize=(cfg.clahe_tile_size, cfg.clahe_tile_size)
        )
        if is_gray:
            img = clahe.apply(img)
        else:
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        steps.append("contrast")

    ok, encoded = cv2.imencode(".png", img)
    if not ok:
        raise PreprocessingError("Preprocessing failed (PNG encoding)")
    out_height, out_width = img.shape[:2]
    report.update(steps=steps, output_format="png", output_size=[out_width, out_height])
    return PreprocessResult(encoded.tobytes(), out_width, out_height, report)


def _to_rgb(image: Image.Image) -> Image.Image:
    """Convert any mode to 8-bit RGB. Transparency is composited on white, not turned black."""
    if image.mode in ("I", "I;16", "I;16B", "I;16L"):
        array = np.asarray(image, dtype=np.float64)
        if array.max() > 255:
            array = array * (255.0 / 65535.0)
        return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8), "L").convert("RGB")
    if image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info:
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return image.convert("RGB")


def estimate_skew_angle(
    gray: np.ndarray, max_angle: float, min_angle: float, min_improvement: float
) -> float:
    """Return the rotation (degrees, in cv2.getRotationMatrix2D's convention) that best aligns
    text lines horizontally, or 0.0 when no clear, worthwhile correction exists.

    Method: projection profile. Rotate a downscaled binary copy through candidate angles and keep
    the angle where horizontal row sums vary the most (text lines make sharp peaks).
    """
    height, width = gray.shape[:2]
    scale = min(1.0, 600.0 / max(height, width))
    small = cv2.resize(gray, (max(1, round(width * scale)), max(1, round(height * scale))),
                       interpolation=cv2.INTER_AREA) if scale < 1.0 else gray
    blurred = cv2.GaussianBlur(small, (3, 3), 0)
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    if cv2.countNonZero(binary) < 0.002 * binary.size:
        return 0.0  # essentially blank: nothing to align

    h, w = binary.shape
    centre = (w / 2.0, h / 2.0)

    def score(angle: float) -> float:
        matrix = cv2.getRotationMatrix2D(centre, angle, 1.0)
        rotated = cv2.warpAffine(binary, matrix, (w, h), flags=cv2.INTER_NEAREST)
        return float(np.var(rotated.sum(axis=1, dtype=np.float64)))

    baseline = score(0.0)
    if baseline <= 0.0:
        return 0.0
    coarse = np.arange(-max_angle, max_angle + 1e-9, 1.0)
    best = max(coarse, key=score)
    fine = np.arange(best - 1.0, best + 1.0 + 1e-9, 0.1)
    best = max(fine, key=score)
    best = float(max(-max_angle, min(max_angle, best)))

    if abs(best) < min_angle or score(best) < baseline * min_improvement:
        return 0.0
    return best


def rotate_keep_content(img: np.ndarray, angle: float) -> np.ndarray:
    """Rotate on an enlarged canvas so no label content is cropped; fill edges by replication."""
    h, w = img.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), angle, 1.0)
    cos, sin = abs(matrix[0, 0]), abs(matrix[0, 1])
    new_w, new_h = int(round(h * sin + w * cos)), int(round(h * cos + w * sin))
    matrix[0, 2] += new_w / 2.0 - w / 2.0
    matrix[1, 2] += new_h / 2.0 - h / 2.0
    return cv2.warpAffine(
        img, matrix, (new_w, new_h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
