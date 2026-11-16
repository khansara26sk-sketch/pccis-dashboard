from sqlalchemy.orm import Session

from app.models import AuditEvent


def record_event(
    db: Session,
    *,
    user_id: int | None,
    action: str,
    inspection_id: int | None = None,
    details: dict | None = None,
) -> AuditEvent:
    """Add an audit event to the session. The caller commits, so the event is saved
    atomically with the change it describes."""
    event = AuditEvent(user_id=user_id, inspection_id=inspection_id, action=action, details=details)
    db.add(event)
    return event
