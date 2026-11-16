import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import (
    AuditEvent, ExtractedField, ImageEvidence, Inspection, InspectionStatus,
    ReviewStatus, RuleResult, RuleStatus, User, UserRole,
)


def make_user(email="a@example.com", **kw):
    return User(full_name="Test Inspector", email=email, hashed_password="x", **kw)


def make_inspection(user, number="INS-0001"):
    return Inspection(inspection_number=number, inspector_id=user.id, product_name="Test product")


def test_user_defaults(db):
    user = make_user()
    db.add(user)
    db.commit()
    assert user.role == UserRole.INSPECTOR
    assert user.is_active is True
    assert user.created_at is not None and user.updated_at is not None


def test_google_only_user_has_no_password(db):
    user = User(full_name="G User", email="g@example.com", google_id="sub-123")
    db.add(user)
    db.commit()
    assert user.hashed_password is None


def test_duplicate_email_rejected(db):
    db.add(make_user())
    db.commit()
    db.add(make_user())
    with pytest.raises(IntegrityError):
        db.commit()


def test_inspection_defaults(db):
    user = make_user()
    db.add(user)
    db.commit()
    insp = make_inspection(user)
    db.add(insp)
    db.commit()
    assert insp.status == InspectionStatus.DRAFT
    assert insp.review_status == ReviewStatus.NOT_REVIEWED
    assert insp.overall_result is None


def test_foreign_keys_are_enforced(db):
    db.add(Inspection(inspection_number="INS-X", inspector_id=9999))
    with pytest.raises(IntegrityError):
        db.commit()


def test_delete_inspection_cascades_but_keeps_audit_trail(db):
    user = make_user()
    db.add(user)
    db.commit()
    insp = make_inspection(user)
    db.add(insp)
    db.commit()
    db.add_all([
        ImageEvidence(inspection_id=insp.id, original_filename="a.jpg", stored_filename="u1.jpg",
                      file_path="uploads/u1.jpg", content_type="image/jpeg"),
        ExtractedField(inspection_id=insp.id, field_name="mrp", extracted_value=None),
        RuleResult(inspection_id=insp.id, rule_id="R1", rule_version="1",
                   status=RuleStatus.MANUAL_REVIEW, explanation="unreadable"),
    ])
    event = AuditEvent(user_id=user.id, inspection_id=insp.id, action="inspection.created",
                       details={"k": "v"})
    db.add(event)
    db.commit()

    db.delete(insp)
    db.commit()

    for model in (ImageEvidence, ExtractedField, RuleResult):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    db.refresh(event)
    assert event.inspection_id is None
    assert event.details == {"k": "v"}


def test_inspector_with_inspections_cannot_be_deleted(db):
    user = make_user()
    db.add(user)
    db.commit()
    db.add(make_inspection(user))
    db.commit()
    db.delete(user)
    with pytest.raises(IntegrityError):
        db.commit()
