from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


FeedbackCategory = Literal[
    "bug",
    "ux",
    "feature",
    "data",
    "future_project",
    "other",
]

FeedbackStatus = Literal[
    "new",
    "reviewed",
    "planned",
    "done",
    "rejected",
]


class FeedbackCreateRequest(BaseModel):
    category: FeedbackCategory

    feature: str | None = Field(
        default=None,
        max_length=100,
    )

    message: str = Field(
        min_length=3,
        max_length=20000,
    )


class FeedbackItem(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
    )

    id: UUID

    category: FeedbackCategory

    feature: str | None = None

    message: str

    status: FeedbackStatus

    created_at: datetime = Field(
        serialization_alias="createdAt",
    )


class FeedbackListResponse(BaseModel):
    items: list[FeedbackItem]


class PublicFeedbackItem(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
    )

    id: UUID

    author_id: UUID = Field(
        serialization_alias="authorId",
    )

    author_name: str = Field(
        serialization_alias="authorName",
    )

    author_company: str | None = Field(
        default=None,
        serialization_alias="authorCompany",
    )

    category: FeedbackCategory

    feature: str | None = None

    message: str

    status: FeedbackStatus

    created_at: datetime = Field(
        serialization_alias="createdAt",
    )


class PublicFeedbackListResponse(BaseModel):
    items: list[PublicFeedbackItem]