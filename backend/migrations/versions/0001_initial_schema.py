"""initial schema: users, inspections, image evidence, extracted fields, rule results, audit events

Revision ID: 0001
Revises:
Create Date: 2026-11-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, length=32)


def _timestamp(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("google_id", sa.String(64), nullable=True),
        sa.Column(
            "role", _enum("userrole", "Inspector", "Senior Officer", "Admin"),
            nullable=False, server_default="Inspector",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    op.create_table(
        "inspections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inspection_number", sa.String(32), nullable=False),
        sa.Column("product_name", sa.String(255), nullable=True),
        sa.Column("inspector_id", sa.Integer(), nullable=False),
        sa.Column("inspection_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            _enum("inspectionstatus", "draft", "image_uploaded", "analyzing", "analyzed", "failed"),
            nullable=False, server_default="draft",
        ),
        sa.Column(
            "review_status",
            _enum("reviewstatus", "not_reviewed", "in_review", "reviewed"),
            nullable=False, server_default="not_reviewed",
        ),
        sa.Column(
            "overall_result",
            _enum("overallresult", "Pass", "Potential Issue", "Manual Review"),
            nullable=True,
        ),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.ForeignKeyConstraint(
            ["inspector_id"], ["users.id"], name="fk_inspections_inspector_id_users", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_inspections"),
    )
    op.create_index("ix_inspections_inspection_number", "inspections", ["inspection_number"], unique=True)
    op.create_index("ix_inspections_inspector_id", "inspections", ["inspector_id"])
    op.create_index("ix_inspections_inspection_date", "inspections", ["inspection_date"])
    op.create_index("ix_inspections_status", "inspections", ["status"])
    op.create_index("ix_inspections_review_status", "inspections", ["review_status"])
    op.create_index("ix_inspections_overall_result", "inspections", ["overall_result"])

    op.create_table(
        "image_evidence",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inspection_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("stored_filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["inspection_id"], ["inspections.id"],
            name="fk_image_evidence_inspection_id_inspections", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_image_evidence"),
        sa.UniqueConstraint("stored_filename", name="uq_image_evidence_stored_filename"),
    )
    op.create_index("ix_image_evidence_inspection_id", "image_evidence", ["inspection_id"])

    op.create_table(
        "extracted_fields",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inspection_id", sa.Integer(), nullable=False),
        sa.Column("field_name", sa.String(64), nullable=False),
        sa.Column("extracted_value", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("manually_corrected", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("corrected_by", sa.Integer(), nullable=True),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(
            ["inspection_id"], ["inspections.id"],
            name="fk_extracted_fields_inspection_id_inspections", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["corrected_by"], ["users.id"],
            name="fk_extracted_fields_corrected_by_users", ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_extracted_fields"),
    )
    op.create_index(
        "ix_extracted_fields_inspection_field", "extracted_fields", ["inspection_id", "field_name"]
    )

    op.create_table(
        "rule_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inspection_id", sa.Integer(), nullable=False),
        sa.Column("rule_id", sa.String(64), nullable=False),
        sa.Column("rule_version", sa.String(32), nullable=False),
        sa.Column("field_name", sa.String(64), nullable=True),
        sa.Column(
            "status",
            _enum(
                "rulestatus", "Pass", "Potential Issue", "Not Detected",
                "Unreadable", "Not Applicable", "Manual Review",
            ),
            nullable=False,
        ),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("evidence_text", sa.Text(), nullable=True),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(
            ["inspection_id"], ["inspections.id"],
            name="fk_rule_results_inspection_id_inspections", ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_rule_results"),
    )
    op.create_index("ix_rule_results_status", "rule_results", ["status"])
    op.create_index("ix_rule_results_inspection_rule", "rule_results", ["inspection_id", "rule_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("inspection_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        _timestamp("timestamp"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_audit_events_user_id_users", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"], ["inspections.id"],
            name="fk_audit_events_inspection_id_inspections", ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_audit_events"),
    )
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"])
    op.create_index("ix_audit_events_inspection_id", "audit_events", ["inspection_id"])
    op.create_index("ix_audit_events_action", "audit_events", ["action"])
    op.create_index("ix_audit_events_timestamp", "audit_events", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("rule_results")
    op.drop_table("extracted_fields")
    op.drop_table("image_evidence")
    op.drop_table("inspections")
    op.drop_table("users")
