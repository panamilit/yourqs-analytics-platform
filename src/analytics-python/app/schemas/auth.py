from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class RegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    access_code: str = Field(
        min_length=1,
        max_length=128,
        validation_alias="accessCode",
    )

    company: str | None = Field(
        default=None,
        max_length=150,
    )

    role_title: str | None = Field(
        default=None,
        max_length=150,
        validation_alias="roleTitle",
        serialization_alias="roleTitle",
    )


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128,
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
    )

    id: UUID
    name: str
    email: EmailStr

    company: str | None = None

    role_title: str | None = Field(
        default=None,
        serialization_alias="roleTitle",
    )

    created_at: datetime = Field(
        serialization_alias="createdAt",
    )


class AuthResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
    )

    access_token: str = Field(
        serialization_alias="accessToken",
    )

    token_type: str = Field(
        default="bearer",
        serialization_alias="tokenType",
    )

    user: UserResponse