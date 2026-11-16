"""Create (or promote) an Admin from the command line. Run on the server, never exposed over HTTP.

    python -m app.scripts.create_admin --email you@college.edu --full-name "Your Name"
"""
import argparse
import getpass
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.database import SessionLocal
from app.models import User, UserRole
from app.services.audit_service import record_event
from app.utils.security import hash_password
from app.utils.validators import normalize_email, normalize_full_name, validate_password_strength


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create or promote an Admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    args = parser.parse_args(argv)

    try:
        email = normalize_email(TypeAdapter(EmailStr).validate_python(args.email))
        full_name = normalize_full_name(args.full_name)
    except (ValidationError, ValueError) as exc:
        print(f"Invalid input: {exc}", file=sys.stderr)
        return 2

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            if existing.role == UserRole.ADMIN:
                print(f"{email} is already an Admin.")
                return 0
            existing.role = UserRole.ADMIN
            record_event(db, user_id=existing.id, action="user.promoted_to_admin_cli")
            db.commit()
            print(f"Existing user {email} promoted to Admin (password unchanged).")
            return 0

        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Confirm password: "):
            print("Passwords do not match.", file=sys.stderr)
            return 2
        try:
            validate_password_strength(password)
        except ValueError as exc:
            print(f"Invalid password: {exc}", file=sys.stderr)
            return 2

        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.ADMIN,
        )
        db.add(user)
        db.flush()
        record_event(db, user_id=user.id, action="user.admin_created_cli")
        db.commit()
        print(f"Admin {email} created.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
