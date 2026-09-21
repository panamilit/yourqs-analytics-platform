from fastapi import (
    Depends,
    HTTPException,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.core.security import (
    decode_access_token,
)
from app.repositories.auth_repository import (
    AuthRepository,
)
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthService


bearer_scheme = HTTPBearer(
    auto_error=False
)

repository = AuthRepository()
service = AuthService(repository)


def get_current_user(
    credentials: HTTPAuthorizationCredentials
    | None = Depends(bearer_scheme),
) -> UserResponse:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication scheme.",
        )

    user_id = decode_access_token(
        credentials.credentials
    )

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token.",
        )

    return service.get_user(
        user_id
    )