from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


ReviewTimeframe = Literal[
    "asap",
    "within_6_months",
    "6_12_months",
    "more_than_12_months",
    "researching",
]


class FeasibilityReviewRequestData(BaseModel):
    assessment_id: UUID

    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=50,
    )

    location: str | None = Field(
        default=None,
        max_length=200,
    )

    postcode: str | None = Field(
        default=None,
        max_length=20,
    )

    project_description: str = Field(
        min_length=10,
        max_length=10000,
    )

    additional_comments: str | None = Field(
        default=None,
        max_length=10000,
    )

    timeframe: ReviewTimeframe | None = None

    consent_to_contact: bool


class FeasibilityReviewFileResponse(BaseModel):
    id: UUID

    file_name: str

    mime_type: str

    file_size: int


class FeasibilityReviewResponse(BaseModel):
    review_request_id: UUID

    assessment_id: UUID

    status: Literal["new"]

    uploaded_files: list[
        FeasibilityReviewFileResponse
    ]

    message: str