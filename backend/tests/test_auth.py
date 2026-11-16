from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select

from app.config import get_settings
from app.models import AuditEvent, User, UserRole
from app.utils.security import JWT_ISSUER, create_access_token

VALID = {
    "full_name": "Asha Verma",
    "email": "asha@example.com",
    "password": "Str0ngPass!",
    "confirm_password": "Str0ngPass!",
}


def register(client, **over):
    return client.post("/api/auth/register", json={**VALID, **over})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# ---- signup ----------------------------------------------------------------------------------
def test_register_success(client, db):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    assert body["user"]["email"] == "asha@example.com"
    assert body["user"]["role"] == "Inspector"
    assert "hashed_password" not in body["user"]
    assert "Str0ngPass!" not in response.text

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.hashed_password.startswith("$argon2")
    assert "Str0ngPass!" not in user.hashed_password


def test_register_token_works_on_me(client):
    token = register(client).json()["access_token"]
    response = client.get("/api/auth/me", headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["email"] == "asha@example.com"


def test_register_normalises_email_and_name(client):
    response = register(client, email="Asha@EXAMPLE.com", full_name="  Asha   Verma ")
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "asha@example.com"
    assert response.json()["user"]["full_name"] == "Asha Verma"


def test_register_duplicate_email_rejected_case_insensitively(client):
    assert register(client).status_code == 201
    response = register(client, email="ASHA@example.com")
    assert response.status_code == 409


def test_register_cannot_assign_admin_role(client, db):
    response = register(client, role="Admin")
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "Inspector"
    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.role == UserRole.INSPECTOR


def test_register_rejects_weak_password_and_mismatch_and_bad_email(client):
    assert register(client, password="short1", confirm_password="short1").status_code == 422
    assert register(client, password="onlyletters", confirm_password="onlyletters").status_code == 422
    assert register(client, confirm_password="Different1!").status_code == 422
    assert register(client, email="not-an-email").status_code == 422
    assert register(client, full_name="   ").status_code == 422


def test_register_without_confirm_password_is_accepted(client):
    payload = {k: v for k, v in VALID.items() if k != "confirm_password"}
    assert client.post("/api/auth/register", json=payload).status_code == 201


def test_validation_errors_do_not_echo_the_password(client):
    response = register(client, password="short1", confirm_password="short1")
    assert response.status_code == 422
    assert "short1" not in response.text


def test_register_writes_audit_event(client, db):
    register(client)
    assert db.scalar(select(AuditEvent).where(AuditEvent.action == "auth.register")) is not None


# ---- login -----------------------------------------------------------------------------------
def test_login_success(client, create_user):
    create_user(email="login@example.com")
    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "Str0ngPass!"}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_email_is_case_insensitive(client, create_user):
    create_user(email="login@example.com")
    response = client.post(
        "/api/auth/login", json={"email": "LOGIN@Example.com", "password": "Str0ngPass!"}
    )
    assert response.status_code == 200


def test_login_wrong_password_and_unknown_email_look_identical(client, create_user):
    create_user(email="login@example.com")
    wrong = client.post("/api/auth/login", json={"email": "login@example.com", "password": "Wrong1234"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "Wrong1234"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_login_rejected_for_google_only_account(client, create_user):
    create_user(email="g@example.com", password=None, google_id="sub-1")
    response = client.post("/api/auth/login", json={"email": "g@example.com", "password": "Str0ngPass!"})
    assert response.status_code == 401


def test_login_inactive_user_forbidden(client, create_user):
    create_user(email="off@example.com", is_active=False)
    response = client.post("/api/auth/login", json={"email": "off@example.com", "password": "Str0ngPass!"})
    assert response.status_code == 403


def test_login_inactive_user_wrong_password_still_401(client, create_user):
    create_user(email="off@example.com", is_active=False)
    response = client.post("/api/auth/login", json={"email": "off@example.com", "password": "Wrong1234"})
    assert response.status_code == 401


def test_login_validation(client):
    assert client.post("/api/auth/login", json={"email": "bad", "password": "x"}).status_code == 422
    assert client.post("/api/auth/login", json={"email": "a@example.com"}).status_code == 422


# ---- protected endpoint / tokens ---------------------------------------------------------------
def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_garbage_and_wrong_scheme(client):
    assert client.get("/api/auth/me", headers=bearer("garbage")).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Basic abc"}).status_code == 401


def test_me_rejects_expired_token(client, create_user):
    user = create_user()
    token, _ = create_access_token(user.id, expires_delta=timedelta(seconds=-5))
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_me_rejects_token_signed_with_other_key(client, create_user):
    user = create_user()
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": str(user.id), "iss": JWT_ISSUER, "iat": now, "exp": now + timedelta(minutes=5)},
        "x" * 40,
        algorithm="HS256",
    )
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_me_rejects_alg_none_token(client, create_user):
    user = create_user()
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": str(user.id), "iss": JWT_ISSUER, "iat": now, "exp": now + timedelta(minutes=5)},
        None,
        algorithm="none",
    )
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_me_rejects_token_for_missing_or_inactive_user(client, create_user):
    ghost_token, _ = create_access_token(99999)
    assert client.get("/api/auth/me", headers=bearer(ghost_token)).status_code == 401
    inactive = create_user(email="off@example.com", is_active=False)
    token, _ = create_access_token(inactive.id)
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_me_returns_current_user(client, create_user, auth_headers):
    user = create_user(email="me@example.com")
    response = client.get("/api/auth/me", headers=auth_headers(user))
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user.id and body["role"] == "Inspector"
    assert "hashed_password" not in body


def test_logout_requires_auth_and_returns_204(client, create_user, auth_headers, db):
    assert client.post("/api/auth/logout").status_code == 401
    user = create_user()
    response = client.post("/api/auth/logout", headers=auth_headers(user))
    assert response.status_code == 204
    assert db.scalar(select(AuditEvent).where(AuditEvent.action == "auth.logout")) is not None


def test_settings_secret_is_not_in_any_response(client):
    body = register(client).text
    assert get_settings().jwt_secret_key not in body
