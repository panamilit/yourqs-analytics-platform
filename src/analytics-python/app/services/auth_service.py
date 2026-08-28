from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
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


class AuthService:
    def __init__(
        self,
        repository: AuthRepository,
    ) -> None:
        self.repository = repository


    def register(
        self,
        request: RegisterRequest,
    ) -> AuthResponse:
        email = request.email.lower().strip()

        existing = (
            self.repository.get_user_by_email(
                email
            )
        )

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        row = self.repository.create_user(
            name=request.name.strip(),
            email=email,
            password_hash=hash_password(
                request.password
            ),
            company=(
                request.company.strip()
                if request.company
                else None
            ),
            role_title=(
                request.role_title.strip()
                if request.role_title
                else None
            ),
        )

        user = self._to_user_response(row)

        return AuthResponse(
            access_token=create_access_token(
                str(user.id)
            ),
            user=user,
        )


    def login(
        self,
        request: LoginRequest,
    ) -> AuthResponse:
        email = request.email.lower().strip()

        row = (
            self.repository.get_user_by_email(
                email
            )
        )

        if (
            row is None
            or not verify_password(
                request.password,
                row["password_hash"],
            )
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        if not row["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="This account is inactive.",
            )

        user = self._to_user_response(row)

        return AuthResponse(
            access_token=create_access_token(
                str(user.id)
            ),
            user=user,
        )


    def get_user(
        self,
        user_id: str,
    ) -> UserResponse:
        row = self.repository.get_user_by_id(
            user_id
        )

        if row is None:
            raise HTTPException(
                status_code=401,
                detail="User account no longer exists.",
            )

        if not row["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="This account is inactive.",
            )

        return self._to_user_response(row)


    @staticmethod
    def _to_user_response(
        row: dict,
    ) -> UserResponse:
        return UserResponse(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            company=row["company"],
            role_title=row["role_title"],
            created_at=row["created_at"],
        )