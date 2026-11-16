
"""Add OCR status and error fields to image evidence.

Revision ID: 0004
Revises: 0003
"""

from alembic import op
import sqlalchemy as sa


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("image_evidence") as batch:
        batch.add_column(
            sa.Column(
                "ocr_status",
                sa.String(length=32),
                nullable=False,
                server_default="pending",
            )
        )
        batch.add_column(
            sa.Column("ocr_error", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("image_evidence") as batch:
        batch.drop_column("ocr_error")
        batch.drop_column("ocr_status")
