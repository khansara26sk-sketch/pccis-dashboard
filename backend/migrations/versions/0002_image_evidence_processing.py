"""image evidence: original metadata and processed-copy columns (Phase 3)

Adds columns only; existing rows and data are preserved.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

UNIQUE_NAME = "uq_image_evidence_processed_stored_filename"
NEW_COLUMNS = (
    "file_size_bytes", "width", "height", "sha256", "preprocessing_status",
    "preprocessing_error", "preprocessing_report", "processed_stored_filename",
    "processed_width", "processed_height", "processed_at",
)


def upgrade() -> None:
    # batch mode lets SQLite add the UNIQUE constraint (it recreates the table); on PostgreSQL
    # it is plain ALTER TABLE.
    with op.batch_alter_table("image_evidence") as batch:
        batch.add_column(sa.Column("file_size_bytes", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("width", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("height", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("sha256", sa.String(64), nullable=True))
        batch.add_column(
            sa.Column(
                "preprocessing_status",
                sa.Enum("pending", "completed", "failed",
                        name="preprocessingstatus", native_enum=False, length=32),
                nullable=False,
                server_default="pending",
            )
        )
        batch.add_column(sa.Column("preprocessing_error", sa.Text(), nullable=True))
        batch.add_column(sa.Column("preprocessing_report", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("processed_stored_filename", sa.String(255), nullable=True))
        batch.add_column(sa.Column("processed_width", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("processed_height", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_unique_constraint(UNIQUE_NAME, ["processed_stored_filename"])


def downgrade() -> None:
    with op.batch_alter_table("image_evidence") as batch:
        batch.drop_constraint(UNIQUE_NAME, type_="unique")
        for column in NEW_COLUMNS:
            batch.drop_column(column)
