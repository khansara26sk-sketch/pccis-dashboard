"""Password hashing (Argon2id) and JWT access tokens."""
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import get_settings

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "pccis-api"

_hasher = PasswordHasher()  # argon2-cffi defaults: Argon2id with a random per-hash salt
_DUMMY_HASH = _hasher.hash("pccis-timing-equaliser-password")


class TokenError(Exception):
    """The token is missing required claims, expired, tampered with, or otherwise invalid."""


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return _hasher.verify(hashed_password, password)
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(hashed_password: str) -> bool:
    return _hasher.check_needs_rehash(hashed_password)


def burn_password_check(password: str) -> None:
    """Spend the same time as a real check so login timing doesn't reveal unknown emails."""
    verify_password(password, _DUMMY_HASH)


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> tuple[str, int]:
    """Return (token, expires_in_seconds). The token carries only the user id; the role is
    always read from the database so role changes and deactivation take effect immediately."""
    settings = get_settings()
    delta = expires_delta if expires_delta is not None else timedelta(
        minutes=settings.access_token_expire_minutes
    )
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iss": JWT_ISSUER, "iat": now, "exp": now + delta}
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)
    return token, int(delta.total_seconds())


def decode_access_token(token: str) -> int:
    """Validate signature, issuer and expiry; return the user id."""
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret_key,
            algorithms=[JWT_ALGORITHM],  # never accept the algorithm named in the token header
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError("Invalid token") from exc
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdigit():
        raise TokenError("Invalid token subject")
    return int(subject)
