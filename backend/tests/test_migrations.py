"""Verifies the hand-written initial migration matches the SQLAlchemy models."""
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import inspect

import app.models  # noqa: F401
from app.config import BASE_DIR
from app.database import Base, make_engine


def _config(url: str) -> Config:
    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def test_upgrade_creates_all_tables_and_matches_models(tmp_path):
    url = f"sqlite:///{tmp_path / 'mig.db'}"
    command.upgrade(_config(url), "head")

    engine = make_engine(url)
    try:
        tables = set(inspect(engine).get_table_names())
        assert {"users", "inspections", "image_evidence", "extracted_fields",
                "rule_results", "audit_events"} <= tables
        with engine.connect() as conn:
            diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
        assert diff == [], f"Migration and models disagree: {diff}"
    finally:
        engine.dispose()


def test_downgrade_removes_tables(tmp_path):
    url = f"sqlite:///{tmp_path / 'mig2.db'}"
    cfg = _config(url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    engine = make_engine(url)
    try:
        assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    finally:
        engine.dispose()
