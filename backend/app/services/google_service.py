"""Backend verification of Google ID tokens (Google Identity Services 'credential')."""
from dataclasses import dataclass

from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import PLACEHOLDER_GOOGLE_CLIENT_ID

GOOGLE_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})
CLOCK_SKEW_SECONDS = 10


class GoogleAuthError(Exception):
    pass


class GoogleNotConfigured(GoogleAuthError):
    """GOOGLE_CLIENT_ID is not set on the server."""


class GoogleTokenInvalid(GoogleAuthError):
    """The credential failed verification (signature, audience, issuer, expiry, claims)."""


class GoogleServiceUnavailable(GoogleAuthError):
    """Google's signing keys could not be fetched, so the token could not be checked."""


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str


def verify_google_id_token(credential: str, client_id: str) -> GoogleIdentity:
    if not client_id or client_id == PLACEHOLDER_GOOGLE_CLIENT_ID:
        raise GoogleNotConfigured("GOOGLE_CLIENT_ID is not configured")

    try:
        # Verifies the RS256 signature against Google's published keys, the expiry and the audience.
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=client_id,
            clock_skew_in_seconds=CLOCK_SKEW_SECONDS,
        )
    except ValueError as exc:
        raise GoogleTokenInvalid("Google token verification failed") from exc
    except google_exceptions.GoogleAuthError as exc:
        raise GoogleServiceUnavailable("Could not reach Google to verify the token") from exc

    # Defence in depth: re-check the claims we rely on.
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleTokenInvalid("Unexpected token issuer")
    audience = claims.get("aud")
    if audience != client_id and not (isinstance(audience, list) and client_id in audience):
        raise GoogleTokenInvalid("Token audience does not match")
    sub = claims.get("sub")
    email = claims.get("email")
    if not isinstance(sub, str) or not sub or not isinstance(email, str) or not email:
        raise GoogleTokenInvalid("Token is missing required claims")
    if claims.get("email_verified") not in (True, "true"):
        raise GoogleTokenInvalid("Google email address is not verified")

    name = claims.get("name")
    if not isinstance(name, str) or not name.strip():
        name = email.split("@", 1)[0]
    return GoogleIdentity(sub=sub, email=email.strip().lower(), name=name)
