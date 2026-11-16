
import secrets
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Inspection, User, UserRole
from app.services.audit_service import record_event


class InspectionNotFound(Exception):
    """Raised both when an inspection doesn't exist and when the user may not see it, so the
    API never reveals which inspection ids exist."""


def _new_inspection_number() -> str:
    return f"INS-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"


def create_inspection(db: Session, user: User, product_name: str | None) -> Inspection:
    for _attempt in range(5):
        inspection = Inspection(
            inspection_number=_new_inspection_number(),
            product_name=product_name,
            inspector_id=user.id,
        )
        db.add(inspection)
        try:
            db.flush()
            record_event(
                db,
                user_id=user.id,
                inspection_id=inspection.id,
                action="inspection.created",
                details={"inspection_number": inspection.inspection_number},
            )
            db.commit()
            return inspection
        except IntegrityError:
            db.rollback()

    raise RuntimeError("Could not generate a unique inspection number")


def get_accessible_inspection(
    db: Session, user: User, inspection_id: int
) -> Inspection:
    """The owner or an Admin may access an inspection; everyone else gets 'not found'."""
    inspection = db.scalar(
        select(Inspection)
        .options(selectinload(Inspection.inspector))
        .where(Inspection.id == inspection_id)
    )

    if inspection is None:
        raise InspectionNotFound()

    if inspection.inspector_id != user.id and user.role != UserRole.ADMIN:
        raise InspectionNotFound()

    return inspection


def list_inspections(
    db: Session,
    user: User,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    status: str | None = None,
) -> list[Inspection]:

    statement = select(Inspection).options(
        selectinload(Inspection.inspector)
    )

    # Normal users can only see their own inspections.
    # Admin can see all inspections.
    if user.role != UserRole.ADMIN:
        statement = statement.where(Inspection.inspector_id == user.id)

    # Search by inspection number or product name.
    if search:
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Inspection.inspection_number.ilike(search_term),
                Inspection.product_name.ilike(search_term),
            )
        )

    # Filter by workflow inspection status.
    if status:
        statement = statement.where(Inspection.status == status)

    statement = (
        statement
        .order_by(Inspection.inspection_date.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())
