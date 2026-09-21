from fastapi import (
    APIRouter,
    Depends,
)

from app.dependencies.current_user import (
    get_current_user,
)
from app.repositories.auth_repository import (
    AuthRepository,
)
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth_service import (
    AuthService,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

repository = AuthRepository()
service = AuthService(repository)


@router.post(
    "/register",
    response_model=AuthResponse,
    response_model_by_alias=True,
    status_code=201,
)
def register(
    request: RegisterRequest,
) -> AuthResponse:
    return service.register(
        request
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    response_model_by_alias=True,
)
def login(
    request: LoginRequest,
) -> AuthResponse:
    return service.login(
        request
    )


@router.get(
    "/me",
    response_model=UserResponse,
    response_model_by_alias=True,
)
def me(
    user: UserResponse = Depends(
        get_current_user
    ),
) -> UserResponse:
    return user