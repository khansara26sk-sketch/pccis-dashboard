"""Add evidence reference to extracted fields.

Revision ID: 0003
Revises: 0002
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("extracted_fields") as batch:
        batch.add_column(
            sa.Column("evidence_id", sa.Integer(), nullable=True)
        )

        batch.create_foreign_key(
            "fk_extracted_fields_evidence_id_image_evidence",
            "image_evidence",
            ["evidence_id"],
            ["id"],
            ondelete="CASCADE",
        )

        batch.create_index(
            "ix_extracted_fields_evidence_id",
            ["evidence_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("extracted_fields") as batch:
        batch.drop_index("ix_extracted_fields_evidence_id")

        batch.drop_constraint(
            "fk_extracted_fields_evidence_id_image_evidence",
            type_="foreignkey",
        )

        batch.drop_column("evidence_id")