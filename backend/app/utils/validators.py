"""Input normalisation and validation helpers shared by schemas and scripts."""
import unicodedata

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128  # also bounds the work Argon2 does per request
MAX_FULL_NAME_LENGTH = 150


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_full_name(value: str) -> str:
    name = " ".join(value.split())  # trims and collapses whitespace
    if not name:
        raise ValueError("Full name must not be empty")
    if len(name) > MAX_FULL_NAME_LENGTH:
        raise ValueError(f"Full name must be at most {MAX_FULL_NAME_LENGTH} characters")
    if any(unicodedata.category(ch).startswith("C") for ch in name):
        raise ValueError("Full name contains invalid characters")
    return name


def validate_password_strength(value: str) -> str:
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(value) > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_LENGTH} characters")
    if not any(ch.isalpha() for ch in value) or not any(ch.isdigit() for ch in value):
        raise ValueError("Password must contain at least one letter and one number")
    return value
