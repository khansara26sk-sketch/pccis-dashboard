from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import get_settings
from app.utils.security import (
    JWT_ISSUER,
    TokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def _payload(**over):
    now = datetime.now(timezone.utc)
    base = {"sub": "1", "iss": JWT_ISSUER, "iat": now, "exp": now + timedelta(minutes=5)}
    return {**base, **over}


def test_hash_is_argon2_salted_and_verifies():
    h1, h2 = hash_password("Str0ngPass!"), hash_password("Str0ngPass!")
    assert h1.startswith("$argon2") and "Str0ngPass!" not in h1
    assert h1 != h2
    assert verify_password("Str0ngPass!", h1)
    assert not verify_password("wrong-pass1", h1)


def test_verify_handles_garbage_hash():
    assert verify_password("anything1", "not-a-hash") is False


def test_token_round_trip():
    token, expires_in = create_access_token(42)
    assert decode_access_token(token) == 42
    assert expires_in == get_settings().access_token_expire_minutes * 60


def test_expired_token_rejected():
    token, _ = create_access_token(1, expires_delta=timedelta(seconds=-5))
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_wrong_signature_rejected():
    token = jwt.encode(_payload(), "x" * 40, algorithm="HS256")
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_alg_none_rejected():
    token = jwt.encode(_payload(), None, algorithm="none")
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_wrong_issuer_rejected():
    token = jwt.encode(_payload(iss="someone-else"), get_settings().jwt_secret_key, algorithm="HS256")
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_missing_claim_rejected():
    payload = _payload()
    del payload["sub"]
    token = jwt.encode(payload, get_settings().jwt_secret_key, algorithm="HS256")
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_non_numeric_subject_rejected():
    token = jwt.encode(_payload(sub="abc"), get_settings().jwt_secret_key, algorithm="HS256")
    with pytest.raises(TokenError):
        decode_access_token(token)


def test_garbage_token_rejected():
    with pytest.raises(TokenError):
        decode_access_token("not.a.jwt")
