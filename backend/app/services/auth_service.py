"""Registration, password login and Google login. Raises domain errors; routes map them to HTTP."""
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.services.audit_service import record_event
from app.services.google_service import GoogleIdentity
from app.utils.security import (
    burn_password_check,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from app.utils.validators import normalize_email, normalize_full_name


class EmailAlreadyRegistered(Exception):
    pass


class InvalidCredentials(Exception):
    pass


class AccountDisabled(Exception):
    pass


class GoogleAccountConflict(Exception):
    """A Google sign-in matched an existing account by email but not by Google ID."""


def _get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def _google_display_name(identity: GoogleIdentity) -> str:
    try:
        return normalize_full_name(identity.name[:150])
    except ValueError:
        return "Google User"


def register_user(db: Session, *, full_name: str, email: str, password: str) -> User:
    email = normalize_email(email)
    if _get_by_email(db, email) is not None:
        raise EmailAlreadyRegistered()

    user = User(
        full_name=full_name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.INSPECTOR,  # public signup can never create anything else
    )
    db.add(user)
    try:
        db.flush()
        record_event(db, user_id=user.id, action="auth.register")
        db.commit()
    except IntegrityError:  # lost a race with a concurrent signup for the same email
        db.rollback()
        raise EmailAlreadyRegistered() from None
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = _get_by_email(db, email)
    if user is None or user.hashed_password is None:
        burn_password_check(password)
        raise InvalidCredentials()
    if not verify_password(password, user.hashed_password):
        raise InvalidCredentials()
    if not user.is_active:
        raise AccountDisabled()

    if password_needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(password)
    record_event(db, user_id=user.id, action="auth.login")
    db.commit()
    return user


def login_or_register_google(db: Session, identity: GoogleIdentity) -> tuple[User, bool]:
    """`identity` must come from google_service.verify_google_id_token, never from the client.

    Accounts are matched by Google's stable `sub`. A Google sign-in is deliberately NOT linked to
    an existing account that merely shares the email: local signups are not email-verified, so
    auto-linking would let someone pre-register a victim's email and later share the account.
    """
    user = db.scalar(select(User).where(User.google_id == identity.sub))
    if user is not None:
        if not user.is_active:
            raise AccountDisabled()
        record_event(db, user_id=user.id, action="auth.google_login")
        db.commit()
        return user, False

    if _get_by_email(db, identity.email) is not None:
        raise GoogleAccountConflict()

    user = User(
        full_name=_google_display_name(identity),
        email=identity.email,
        hashed_password=None,
        google_id=identity.sub,
        role=UserRole.INSPECTOR,
    )
    db.add(user)
    try:
        db.flush()
        record_event(db, user_id=user.id, action="auth.google_register")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise GoogleAccountConflict() from None
    return user, True
