"""Pure image tests: no database, no web app. Real OpenCV/Pillow processing on generated images."""
import dataclasses
import hashlib
import io

import cv2
import numpy as np
from PIL import Image

from app.config import PreprocessingSettings
from app.services import image_service as svc
from app.utils.files import sanitize_display_filename
from tests.helpers import jpeg_with_orientation, label_array, make_image, png_from_bgr

ALLOWED = ("jpeg", "png", "webp")


def _raises(exc_type, func, *args, **kwargs):
    try:
        func(*args, **kwargs)
    except exc_type:
        return True
    return False


def _validate(data, expected=None, max_pixels=40_000_000):
    return svc.validate_image_bytes(
        data, allowed_formats=ALLOWED, max_pixels=max_pixels, expected_format=expected
    )


# ---- validation ------------------------------------------------------------------------------
def test_valid_images_accepted_with_metadata():
    for fmt, expected in (("PNG", "png"), ("JPEG", "jpeg"), ("WEBP", "webp")):
        data = make_image(fmt, (320, 200))
        info = _validate(data, expected)
        assert (info.format, info.width, info.height) == (expected, 320, 200)
        assert info.size_bytes == len(data)
        assert info.sha256 == hashlib.sha256(data).hexdigest()


def test_garbage_empty_and_truncated_rejected():
    assert _raises(svc.InvalidImageContent, _validate, b"this is not an image")
    assert _raises(svc.InvalidImageContent, _validate, b"")
    data = make_image("PNG", (600, 400))
    assert _raises(svc.InvalidImageContent, _validate, data[: len(data) // 2])


def test_disallowed_and_mismatched_formats_rejected():
    assert _raises(svc.InvalidImageContent, _validate, make_image("GIF"))
    assert _raises(svc.InvalidImageContent, _validate, make_image("PNG"), "jpeg")


def test_pixel_limit_rejected():
    assert _raises(svc.InvalidImageContent, _validate, make_image("PNG", (500, 500)), None, 1000)


def test_declared_type_checks():
    check = svc.check_declared_type
    assert check("a.PNG", "image/png", ALLOWED) == "png"
    assert check("a.jpg", "image/jpeg", ALLOWED) == "jpeg"
    assert check("a.jpeg", "image/jpg", ALLOWED) == "jpeg"
    assert check("a.webp", "image/webp; charset=x", ALLOWED) == "webp"
    for name, mime in [("a.gif", "image/gif"), ("a.txt", "text/plain"), ("a", "image/png"),
                       ("a.php", "image/png"), ("a.png", "text/plain"), ("a.png", "image/jpeg"),
                       ("a.png", None), ("a.png", "application/octet-stream")]:
        assert _raises(svc.UnsupportedImageType, check, name, mime, ALLOWED), (name, mime)
    assert _raises(svc.UnsupportedImageType, check, "a.webp", "image/webp", ("png",))


# ---- preprocessing ---------------------------------------------------------------------------
def test_preprocess_outputs_grayscale_png_and_does_not_touch_input():
    data = make_image("PNG", (320, 200))
    before = hashlib.sha256(data).hexdigest()
    result = svc.preprocess_image(data, PreprocessingSettings())
    out = Image.open(io.BytesIO(result.png_bytes))
    assert out.format == "PNG" and out.mode == "L"
    assert (result.width, result.height) == out.size
    assert hashlib.sha256(data).hexdigest() == before
    assert result.report["steps"][:2] == ["grayscale", "denoise"]
    assert "contrast" in result.report["steps"]


def test_resize_preserves_aspect_ratio_and_never_upscales():
    cfg = PreprocessingSettings(deskew=False)
    big = svc.preprocess_image(make_image("JPEG", (4000, 3000)), cfg)
    assert (big.width, big.height) == (2000, 1500) and big.report["resized"] is True
    small = svc.preprocess_image(make_image("PNG", (300, 200)), cfg)
    assert (small.width, small.height) == (300, 200) and small.report["resized"] is False


def test_exif_orientation_is_corrected():
    data = jpeg_with_orientation(6, size=(400, 200))  # 6 = rotate 90 degrees to display upright
    result = svc.preprocess_image(data, PreprocessingSettings(deskew=False))
    assert result.report["exif_orientation_applied"] is True
    assert (result.width, result.height) == (200, 400)


def test_deskew_corrects_a_tilted_label():
    tilted = svc.rotate_keep_content(label_array(), 5.0)
    result = svc.preprocess_image(png_from_bgr(tilted), PreprocessingSettings())
    assert "deskew" in result.report["steps"]
    assert abs(result.report["deskew_angle"] - (-5.0)) < 1.0
    processed = cv2.imdecode(np.frombuffer(result.png_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    assert svc.estimate_skew_angle(processed, 15, 0.5, 1.15) == 0.0  # straight afterwards


def test_deskew_leaves_straight_and_blank_images_alone():
    straight = svc.preprocess_image(png_from_bgr(label_array()), PreprocessingSettings())
    assert straight.report["deskew_angle"] is None and "deskew" not in straight.report["steps"]
    blank = svc.preprocess_image(make_image("PNG", (400, 300)), PreprocessingSettings())
    assert blank.report["deskew_angle"] is None


def test_every_step_can_be_disabled():
    cfg = PreprocessingSettings(grayscale=False, denoise=False, deskew=False, contrast=False)
    data = make_image("PNG", (320, 200))
    result = svc.preprocess_image(data, cfg)
    assert result.report["steps"] == []
    assert (result.width, result.height) == (320, 200)
    assert Image.open(io.BytesIO(result.png_bytes)).mode == "RGB"  # colour kept


def test_colour_pipeline_works_when_grayscale_is_off():
    cfg = dataclasses.replace(PreprocessingSettings(), grayscale=False, deskew=False)
    result = svc.preprocess_image(make_image("PNG", (320, 200)), cfg)
    assert "denoise" in result.report["steps"] and "contrast" in result.report["steps"]
    assert Image.open(io.BytesIO(result.png_bytes)).mode == "RGB"


def test_transparent_png_is_composited_on_white():
    image = Image.new("RGBA", (200, 100), (0, 0, 0, 0))  # fully transparent
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    result = svc.preprocess_image(buffer.getvalue(), PreprocessingSettings(deskew=False, contrast=False, denoise=False))
    pixels = np.asarray(Image.open(io.BytesIO(result.png_bytes)))
    assert pixels.min() > 240  # white, not black


def test_corrupt_data_raises_clean_preprocessing_error():
    try:
        svc.preprocess_image(b"not an image", PreprocessingSettings())
    except svc.PreprocessingError as exc:
        assert "Preprocessing failed" in str(exc)
    else:
        raise AssertionError("expected PreprocessingError")


# ---- display file names ----------------------------------------------------------------------
def test_display_filename_sanitised():
    assert sanitize_display_filename("../../evil.png") == "evil.png"
    assert sanitize_display_filename("C:\\Users\\x\\label.JPG") == "label.JPG"
    assert sanitize_display_filename("a\x00b.png") == "ab.png"
    assert sanitize_display_filename("") == "upload"
    assert sanitize_display_filename(None) == "upload"
    assert sanitize_display_filename("...") == "upload"
    assert len(sanitize_display_filename("x" * 400 + ".png")) <= 255
