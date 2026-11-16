from collections.abc import Callable

from app.config import get_settings
from app.services.google_service import GoogleIdentity, verify_google_id_token

GoogleVerifier = Callable[[str], GoogleIdentity]


def get_google_verifier() -> GoogleVerifier:
    """Dependency returning the function that verifies a Google credential. Tests replace it
    so they never contact Google; production always uses real verification."""
    client_id = get_settings().google_client_id
    return lambda credential: verify_google_id_token(credential, client_id)
