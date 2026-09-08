from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


ProjectType = Literal[
    "new_build",
    "renovation",
    "extension",
    "multi_unit",
]

AssessmentStatus = Literal[
    "completed",
    "insufficient_data",
]

ReviewStatus = Literal[
    "new",
    "reviewing",
    "contacted",
    "completed",
    "closed",
]


class FeasibilityAdminOverviewResponse(BaseModel):
    total_assessments: int

    assessments_today: int

    assessments_last_7_days: int

    assessments_last_30_days: int

    unique_sessions: int

    completed_assessments: int

    insufficient_data_assessments: int

    detailed_review_requests: int

    new_review_requests: int

    review_conversion_percent: Decimal | None

    average_confidence_score: Decimal | None

    project_type_distribution: dict[str, int]

    verdict_distribution: dict[str, int]

    confidence_distribution: dict[str, int]


class FeasibilityAssessmentAdminItem(BaseModel):
    id: UUID

    created_at: datetime

    session_id: UUID

    project_type: str

    floor_area: Decimal | None = None

    affected_area: Decimal | None = None

    levels: int | None = None

    bathrooms: int | None = None

    kitchens: int | None = None

    budget: Decimal | None = None

    assessment_status: str

    estimate_typical: Decimal | None = None

    verdict: str | None = None

    confidence: str

    confidence_score: int | None = None

    comparable_count: int

    average_similarity: Decimal | None = None

    has_review_request: bool


class FeasibilityAssessmentAdminPage(BaseModel):
    items: list[
        FeasibilityAssessmentAdminItem
    ]

    page: int

    page_size: int

    total_items: int

    total_pages: int


class FeasibilityAssessmentAdminDetail(BaseModel):
    id: UUID

    created_at: datetime

    session_id: UUID

    project_type: str

    floor_area: Decimal | None = None

    affected_area: Decimal | None = None

    levels: int | None = None

    bathrooms: int | None = None

    kitchens: int | None = None

    budget: Decimal | None = None

    scope_json: dict[str, Any]

    request_json: dict[str, Any]

    assessment_status: str

    estimate_low: Decimal | None = None

    estimate_typical: Decimal | None = None

    estimate_high: Decimal | None = None

    typical_per_sqm: Decimal | None = None

    verdict: str | None = None

    confidence: str

    confidence_score: int | None = None

    comparable_count: int

    average_similarity: Decimal | None = None

    response_json: dict[str, Any]

    review_request_id: UUID | None = None


class FeasibilityReviewAdminItem(BaseModel):
    id: UUID

    created_at: datetime

    updated_at: datetime

    assessment_id: UUID | None = None

    session_id: UUID

    first_name: str

    last_name: str

    email: str

    phone: str | None = None

    location: str | None = None

    postcode: str | None = None

    project_type: str

    budget: Decimal | None = None

    status: str

    file_count: int


class FeasibilityReviewAdminPage(BaseModel):
    items: list[
        FeasibilityReviewAdminItem
    ]

    page: int

    page_size: int

    total_items: int

    total_pages: int


class FeasibilityReviewAdminFile(BaseModel):
    id: UUID

    uploaded_at: datetime

    file_name: str

    mime_type: str

    file_size: int


class FeasibilityReviewAdminDetail(BaseModel):
    id: UUID

    created_at: datetime

    updated_at: datetime

    assessment_id: UUID | None = None

    session_id: UUID

    first_name: str

    last_name: str

    email: str

    phone: str | None = None

    location: str | None = None

    postcode: str | None = None

    project_description: str

    additional_comments: str | None = None

    timeframe: str | None = None

    project_type: str

    floor_area: Decimal | None = None

    affected_area: Decimal | None = None

    levels: int | None = None

    bathrooms: int | None = None

    kitchens: int | None = None

    budget: Decimal | None = None

    scope_json: dict[str, Any]

    status: str

    consent_to_contact: bool

    files: list[
        FeasibilityReviewAdminFile
    ]


class FeasibilityReviewStatusUpdate(BaseModel):
    status: ReviewStatus


class FeasibilityReviewStatusResponse(BaseModel):
    id: UUID

    status: ReviewStatus

    updated_at: datetime