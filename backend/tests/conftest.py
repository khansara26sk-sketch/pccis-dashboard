import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.database import Base, get_db, make_engine
from app.main import create_app


@pytest.fixture()
def engine(tmp_path):
    eng = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db(session_factory):
    with session_factory() as session:
        yield session


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        with session_factory() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as c:
        yield c


# ---- Phase 2 helpers -------------------------------------------------------------------------
from app.dependencies.google import get_google_verifier  # noqa: E402
from app.models import User, UserRole  # noqa: E402
from app.utils.security import create_access_token, hash_password  # noqa: E402

DEFAULT_PASSWORD = "Str0ngPass!"


@pytest.fixture()
def create_user(db):
    def _create(email="user@example.com", password=DEFAULT_PASSWORD, role=UserRole.INSPECTOR, **kw):
        user = User(
            full_name=kw.pop("full_name", "Test User"),
            email=email,
            hashed_password=hash_password(password) if password is not None else None,
            role=role,
            **kw,
        )
        db.add(user)
        db.commit()
        return user

    return _create


@pytest.fixture()
def auth_headers():
    def _headers(user):
        token, _ = create_access_token(user.id)
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.fixture()
def use_google_verifier(client):
    """Replace Google verification with a stand-in that returns `identity` or raises `error`.
    Only used in tests so they never contact Google."""

    def _use(identity=None, error=None):
        def verify(_credential):
            if error is not None:
                raise error
            return identity

        client.app.dependency_overrides[get_google_verifier] = lambda: verify

    return _use


# ---- Phase 3 helpers -------------------------------------------------------------------------
import dataclasses  # noqa: E402

from app.config import get_settings  # noqa: E402


@pytest.fixture()
def storage_settings(client, tmp_path):
    """Point evidence storage at a temporary directory for this test only."""
    settings = dataclasses.replace(
        get_settings(),
        upload_dir=tmp_path / "uploads",
        processed_dir=tmp_path / "uploads" / "processed",
    )
    client.app.dependency_overrides[get_settings] = lambda: settings
    return settings


@pytest.fixture()
def configure_settings(client, storage_settings):
    """Override individual settings (e.g. a tiny upload limit) for this test."""

    def _apply(**changes):
        settings = dataclasses.replace(storage_settings, **changes)
        client.app.dependency_overrides[get_settings] = lambda: settings
        return settings

    return _apply
