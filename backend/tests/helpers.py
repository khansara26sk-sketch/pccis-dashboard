"""Image-building helpers for tests (real images, generated in memory)."""
import io

import cv2
import numpy as np
from PIL import Image, ImageDraw

LINES = ["NET QTY 500 g", "MRP Rs. 120.00 incl. all taxes", "MFD 08/2026 PACKED BY ABC FOODS",
         "Consumer care: 1800-000-000", "Country of origin: India"]


def label_array(width: int = 1000, height: int = 700) -> np.ndarray:
    """A white 'label' with several lines of dark text, as a BGR array."""
    img = np.full((height, width, 3), 255, np.uint8)
    for i, text in enumerate(LINES):
        cv2.putText(img, text, (60, 100 + i * 110), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (20, 20, 20), 3, cv2.LINE_AA)
    return img


def make_image(fmt: str = "PNG", size: tuple[int, int] = (320, 200), mode: str = "RGB") -> bytes:
    image = Image.new(mode, size, "white" if mode in ("RGB", "L") else (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    draw.text((10, 10), "NET QTY 500 g  MRP Rs. 120", fill="black" if mode in ("RGB", "L") else (0, 0, 0, 255))
    buffer = io.BytesIO()
    image.save(buffer, fmt)
    return buffer.getvalue()


def png_from_bgr(array: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(cv2.cvtColor(array, cv2.COLOR_BGR2RGB)).save(buffer, "PNG")
    return buffer.getvalue()


def jpeg_with_orientation(orientation: int, size: tuple[int, int] = (400, 200)) -> bytes:
    image = Image.new("RGB", size, "white")
    ImageDraw.Draw(image).text((10, 10), "ORIENTATION TEST", fill="black")
    exif = Image.Exif()
    exif[0x0112] = orientation
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", exif=exif)
    return buffer.getvalue()
