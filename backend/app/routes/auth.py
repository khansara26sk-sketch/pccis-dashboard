from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.dependencies.google import GoogleVerifier, get_google_verifier
from app.models import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
)
from app.services import auth_service
from app.services.audit_service import record_event
from app.services.google_service import (
    GoogleNotConfigured,
    GoogleServiceUnavailable,
    GoogleTokenInvalid,
)
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
DbSession = Annotated[Session, Depends(get_db)]


def _token_response(user: User) -> TokenResponse:
    token, expires_in = create_access_token(user.id)
    return TokenResponse(
        access_token=token, expires_in=expires_in, user=UserRead.model_validate(user)
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    try:
        user = auth_service.register_user(
            db, full_name=payload.full_name, email=payload.email, password=payload.password
        )
    except auth_service.EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    try:
        user = auth_service.authenticate_user(db, email=payload.email, password=payload.password)
    except auth_service.InvalidCredentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    except auth_service.AccountDisabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled")
    return _token_response(user)


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    db: DbSession,
    verify: Annotated[GoogleVerifier, Depends(get_google_verifier)],
) -> TokenResponse:
    try:
        identity = verify(payload.credential)
    except GoogleNotConfigured:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Google login is not configured on the server"
        )
    except GoogleTokenInvalid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google credential")
    except GoogleServiceUnavailable:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google sign-in could not be verified right now. Please try again.",
        )

    try:
        user, _created = auth_service.login_or_register_google(db, identity)
    except auth_service.GoogleAccountConflict:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists. Sign in with your email and password.",
        )
    except auth_service.AccountDisabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled")
    return _token_response(user)


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> User:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: CurrentUser, db: DbSession) -> Response:
    # Access tokens are stateless JWTs, so the client discards its token; this endpoint only
    # records the event. Tokens expire on their own (ACCESS_TOKEN_EXPIRE_MINUTES).
    record_event(db, user_id=current_user.id, action="auth.logout")
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
