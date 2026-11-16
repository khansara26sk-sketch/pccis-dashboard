
"""Application settings loaded from environment variables / backend/.env."""

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
PLACEHOLDER_SECRET = "replace_with_secure_random_secret"
PLACEHOLDER_GOOGLE_CLIENT_ID = "your_google_client_id"
SQLITE_PREFIX = "sqlite:///"
SUPPORTED_IMAGE_FORMATS = ("jpeg", "png", "webp")


@dataclass(frozen=True)
class PreprocessingSettings:
    """Image preprocessing options. Every step can be switched off from the environment."""

    max_dimension: int = 2000
    grayscale: bool = True
    denoise: bool = True
    denoise_strength: float = 5.0
    deskew: bool = True
    deskew_max_angle: float = 15.0
    deskew_min_angle: float = 0.5
    deskew_min_improvement: float = 1.15
    contrast: bool = True
    clahe_clip_limit: float = 2.0
    clahe_tile_size: int = 8


@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str
    jwt_secret_key: str
    google_client_id: str
    upload_dir: Path
    max_upload_size_mb: int
    cors_origins: tuple[str, ...]
    access_token_expire_minutes: int = 60
    processed_dir: Path = Path("uploads/processed")
    allowed_image_formats: tuple[str, ...] = SUPPORTED_IMAGE_FORMATS
    max_image_pixels: int = 40_000_000
    max_images_per_inspection: int = 10
    preprocessing: PreprocessingSettings = field(
        default_factory=PreprocessingSettings
    )

    # OCR configuration
    # None means pytesseract will search for Tesseract through system PATH.
    tesseract_cmd: str | None = None

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def originals_dir(self) -> Path:
        return self.upload_dir / "originals"


def _resolve_sqlite_url(url: str) -> str:
    """Make relative SQLite paths relative to backend/, not the current directory."""
    if not url.startswith(SQLITE_PREFIX):
        return url

    path = url[len(SQLITE_PREFIX):]

    if path in ("", ":memory:") or Path(path).is_absolute():
        return url

    return f"{SQLITE_PREFIX}{(BASE_DIR / path).resolve()}"


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default))

    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"{name} must be an integer, got {raw!r}"
        ) from exc

    if value < minimum:
        raise RuntimeError(f"{name} must be at least {minimum}")

    return value


def _env_float(
    name: str,
    default: float,
    minimum: float = 0.0,
) -> float:
    raw = os.getenv(name, str(default))

    try:
        value = float(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"{name} must be a number, got {raw!r}"
        ) from exc

    if value < minimum:
        raise RuntimeError(f"{name} must be at least {minimum}")

    return value


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)

    if raw is None:
        return default

    value = raw.strip().lower()

    if value in ("1", "true", "yes", "on"):
        return True

    if value in ("0", "false", "no", "off"):
        return False

    raise RuntimeError(f"{name} must be true or false, got {raw!r}")


def _load_image_formats() -> tuple[str, ...]:
    raw = os.getenv(
        "ALLOWED_IMAGE_FORMATS",
        ",".join(SUPPORTED_IMAGE_FORMATS),
    )

    formats: list[str] = []

    for item in raw.split(","):
        name = item.strip().lower()

        if not name:
            continue

        name = "jpeg" if name == "jpg" else name

        if name not in SUPPORTED_IMAGE_FORMATS:
            raise RuntimeError(
                f"ALLOWED_IMAGE_FORMATS contains unsupported format "
                f"{item.strip()!r}; supported: "
                f"{', '.join(SUPPORTED_IMAGE_FORMATS)}"
            )

        if name not in formats:
            formats.append(name)

    if not formats:
        raise RuntimeError(
            "ALLOWED_IMAGE_FORMATS must list at least one format"
        )

    return tuple(formats)


def load_settings() -> Settings:
    load_dotenv(BASE_DIR / ".env", override=False)

    environment = os.getenv(
        "ENVIRONMENT",
        "development",
    ).strip().lower()

    secret = os.getenv(
        "JWT_SECRET_KEY",
        PLACEHOLDER_SECRET,
    )

    if environment == "production" and (
        secret == PLACEHOLDER_SECRET or len(secret) < 32
    ):
        raise RuntimeError(
            "JWT_SECRET_KEY must be set to a random value "
            "of at least 32 characters in production."
        )

    raw_size = os.getenv("MAX_UPLOAD_SIZE_MB", "10")

    try:
        max_mb = int(raw_size)
    except ValueError as exc:
        raise RuntimeError(
            f"MAX_UPLOAD_SIZE_MB must be an integer, got {raw_size!r}"
        ) from exc

    if max_mb <= 0:
        raise RuntimeError(
            "MAX_UPLOAD_SIZE_MB must be greater than zero"
        )

    raw_expiry = os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "60",
    )

    try:
        expire_minutes = int(raw_expiry)
    except ValueError as exc:
        raise RuntimeError(
            "ACCESS_TOKEN_EXPIRE_MINUTES must be an integer, "
            f"got {raw_expiry!r}"
        ) from exc

    if expire_minutes <= 0:
        raise RuntimeError(
            "ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero"
        )

    upload_dir = Path(
        os.getenv("UPLOAD_DIR", "uploads")
    )

    if not upload_dir.is_absolute():
        upload_dir = BASE_DIR / upload_dir

    raw_processed = os.getenv("PROCESSED_DIR")

    processed_dir = (
        Path(raw_processed)
        if raw_processed
        else upload_dir / "processed"
    )

    if not processed_dir.is_absolute():
        processed_dir = BASE_DIR / processed_dir

    processed_dir = processed_dir.resolve()

    if processed_dir == (upload_dir.resolve() / "originals"):
        raise RuntimeError(
            "PROCESSED_DIR must not be the originals directory"
        )

    preprocessing = PreprocessingSettings(
        max_dimension=_env_int(
            "PREPROCESS_MAX_DIMENSION",
            2000,
            minimum=256,
        ),
        grayscale=_env_bool(
            "PREPROCESS_GRAYSCALE",
            True,
        ),
        denoise=_env_bool(
            "PREPROCESS_DENOISE",
            True,
        ),
        denoise_strength=_env_float(
            "PREPROCESS_DENOISE_STRENGTH",
            5.0,
            minimum=0.0,
        ),
        deskew=_env_bool(
            "PREPROCESS_DESKEW",
            True,
        ),
        deskew_max_angle=_env_float(
            "PREPROCESS_DESKEW_MAX_ANGLE",
            15.0,
            minimum=1.0,
        ),
        deskew_min_angle=_env_float(
            "PREPROCESS_DESKEW_MIN_ANGLE",
            0.5,
            minimum=0.0,
        ),
        deskew_min_improvement=_env_float(
            "PREPROCESS_DESKEW_MIN_IMPROVEMENT",
            1.15,
            minimum=1.0,
        ),
        contrast=_env_bool(
            "PREPROCESS_CONTRAST",
            True,
        ),
        clahe_clip_limit=_env_float(
            "PREPROCESS_CLAHE_CLIP_LIMIT",
            2.0,
            minimum=0.1,
        ),
        clahe_tile_size=_env_int(
            "PREPROCESS_CLAHE_TILE_SIZE",
            8,
            minimum=2,
        ),
    )

    origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    return Settings(
        environment=environment,
        database_url=_resolve_sqlite_url(
            os.getenv(
                "DATABASE_URL",
                "sqlite:///./pccis.db",
            )
        ),
        jwt_secret_key=secret,
        google_client_id=os.getenv(
            "GOOGLE_CLIENT_ID",
            "",
        ),
        upload_dir=upload_dir.resolve(),
        max_upload_size_mb=max_mb,
        cors_origins=tuple(
            origin.strip()
            for origin in origins.split(",")
            if origin.strip()
        ),
        access_token_expire_minutes=expire_minutes,
        processed_dir=processed_dir,
        allowed_image_formats=_load_image_formats(),
        max_image_pixels=_env_int(
            "MAX_IMAGE_PIXELS",
            40_000_000,
            minimum=10_000,
        ),
        max_images_per_inspection=_env_int(
            "MAX_IMAGES_PER_INSPECTION",
            10,
        ),
        preprocessing=preprocessing,

        # OCR: use configured executable or system PATH.
        tesseract_cmd=os.getenv("TESSERACT_CMD") or None,
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings()
