import pytest

from app.config import BASE_DIR, PLACEHOLDER_SECRET, load_settings


def test_relative_sqlite_path_resolves_against_backend_dir(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./pccis.db")
    assert load_settings().database_url == f"sqlite:///{(BASE_DIR / 'pccis.db').resolve()}"


def test_production_rejects_placeholder_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", PLACEHOLDER_SECRET)
    with pytest.raises(RuntimeError):
        load_settings()


def test_production_rejects_short_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "too-short")
    with pytest.raises(RuntimeError):
        load_settings()


def test_production_accepts_long_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "x" * 40)
    assert load_settings().environment == "production"


@pytest.mark.parametrize("value", ["abc", "0", "-5"])
def test_invalid_upload_size_rejected(monkeypatch, value):
    monkeypatch.setenv("MAX_UPLOAD_SIZE_MB", value)
    with pytest.raises(RuntimeError):
        load_settings()
