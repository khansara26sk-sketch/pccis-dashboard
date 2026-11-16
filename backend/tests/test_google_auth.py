import pytest
from google.auth import exceptions as google_exceptions
from sqlalchemy import select

from app.models import User, UserRole
from app.services import google_service
from app.services.google_service import (
    GoogleIdentity,
    GoogleNotConfigured,
    GoogleServiceUnavailable,
    GoogleTokenInvalid,
    verify_google_id_token,
)

CLIENT_ID = "1234567890-abc.apps.googleusercontent.com"
IDENTITY = GoogleIdentity(sub="google-sub-1", email="g.user@example.com", name="G User")


# ---- endpoint behaviour (verifier replaced by a test stand-in) --------------------------------
def test_google_login_creates_new_inspector(client, db, use_google_verifier):
    use_google_verifier(identity=IDENTITY)
    response = client.post("/api/auth/google", json={"credential": "token"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "Inspector"
    user = db.scalar(select(User).where(User.google_id == "google-sub-1"))
    assert user.email == "g.user@example.com"
    assert user.hashed_password is None
    assert user.role == UserRole.INSPECTOR


def test_google_login_is_repeatable_without_duplicates(client, db, use_google_verifier):
    use_google_verifier(identity=IDENTITY)
    first = client.post("/api/auth/google", json={"credential": "token"})
    second = client.post("/api/auth/google", json={"credential": "token"})
    assert first.status_code == second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    assert len(db.scalars(select(User)).all()) == 1


def test_google_login_ignores_identity_fields_sent_by_the_client(client, db, use_google_verifier):
    use_google_verifier(identity=IDENTITY)
    response = client.post(
        "/api/auth/google",
        json={"credential": "token", "email": "attacker@example.com", "google_id": "evil", "role": "Admin"},
    )
    assert response.status_code == 200
    user = db.scalar(select(User))
    assert user.email == "g.user@example.com"
    assert user.google_id == "google-sub-1"
    assert user.role == UserRole.INSPECTOR


def test_google_login_accepts_id_token_alias(client, use_google_verifier):
    use_google_verifier(identity=IDENTITY)
    assert client.post("/api/auth/google", json={"id_token": "token"}).status_code == 200


def test_google_does_not_link_to_existing_password_account(client, db, create_user, use_google_verifier):
    create_user(email="g.user@example.com")
    use_google_verifier(identity=IDENTITY)
    response = client.post("/api/auth/google", json={"credential": "token"})
    assert response.status_code == 409
    db.expire_all()
    assert db.scalar(select(User).where(User.email == "g.user@example.com")).google_id is None


def test_google_login_rejects_invalid_token(client, use_google_verifier):
    use_google_verifier(error=GoogleTokenInvalid("bad"))
    assert client.post("/api/auth/google", json={"credential": "token"}).status_code == 401


def test_google_login_reports_unconfigured_and_unavailable(client, use_google_verifier):
    use_google_verifier(error=GoogleNotConfigured("no client id"))
    assert client.post("/api/auth/google", json={"credential": "t"}).status_code == 503
    use_google_verifier(error=GoogleServiceUnavailable("down"))
    assert client.post("/api/auth/google", json={"credential": "t"}).status_code == 503


def test_google_login_disabled_account_forbidden(client, create_user, use_google_verifier):
    create_user(email="g.user@example.com", password=None, google_id="google-sub-1", is_active=False)
    use_google_verifier(identity=IDENTITY)
    assert client.post("/api/auth/google", json={"credential": "t"}).status_code == 403


def test_google_request_validation(client):
    assert client.post("/api/auth/google", json={}).status_code == 422
    assert client.post("/api/auth/google", json={"credential": ""}).status_code == 422


# ---- token verification logic (Google's library call replaced by a stand-in) -------------------
def _claims(**over):
    base = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "12345",
        "email": "Person@Example.com",
        "email_verified": True,
        "name": "Person One",
    }
    return {**base, **over}


def _patch_library(monkeypatch, claims=None, exc=None):
    def fake(token, request, audience=None, clock_skew_in_seconds=0):
        assert audience == CLIENT_ID  # the backend must always pass its own client id
        if exc is not None:
            raise exc
        return claims

    monkeypatch.setattr(google_service.id_token, "verify_oauth2_token", fake)


def test_valid_claims_produce_identity(monkeypatch):
    _patch_library(monkeypatch, claims=_claims())
    identity = verify_google_id_token("tok", CLIENT_ID)
    assert identity == GoogleIdentity(sub="12345", email="person@example.com", name="Person One")


def test_name_falls_back_to_email_local_part(monkeypatch):
    _patch_library(monkeypatch, claims=_claims(name=None))
    assert verify_google_id_token("tok", CLIENT_ID).name == "Person"


@pytest.mark.parametrize(
    "override",
    [
        {"iss": "https://evil.example.com"},
        {"aud": "another-client-id"},
        {"email_verified": False},
        {"email_verified": None},
        {"sub": ""},
        {"email": ""},
    ],
)
def test_bad_claims_rejected(monkeypatch, override):
    _patch_library(monkeypatch, claims=_claims(**override))
    with pytest.raises(GoogleTokenInvalid):
        verify_google_id_token("tok", CLIENT_ID)


def test_library_rejection_becomes_invalid(monkeypatch):
    _patch_library(monkeypatch, exc=ValueError("Token expired"))
    with pytest.raises(GoogleTokenInvalid):
        verify_google_id_token("tok", CLIENT_ID)


def test_certificate_fetch_failure_becomes_unavailable(monkeypatch):
    _patch_library(monkeypatch, exc=google_exceptions.TransportError("network"))
    with pytest.raises(GoogleServiceUnavailable):
        verify_google_id_token("tok", CLIENT_ID)


@pytest.mark.parametrize("client_id", ["", "your_google_client_id"])
def test_unconfigured_client_id(client_id):
    with pytest.raises(GoogleNotConfigured):
        verify_google_id_token("tok", client_id)
