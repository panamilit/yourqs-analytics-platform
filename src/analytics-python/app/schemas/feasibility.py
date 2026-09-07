from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ProjectType = Literal[
    "new_build",
    "renovation",
    "extension",
    "multi_unit",
]


class FeasibilityArea(BaseModel):
    floor_area: Decimal | None = Field(
        default=None,
        gt=0,
    )

    affected_area: Decimal | None = Field(
        default=None,
        gt=0,
    )


class FeasibilityLayout(BaseModel):
    levels: int | None = Field(
        default=None,
        ge=1,
    )

    bathrooms: int | None = Field(
        default=None,
        ge=0,
    )

    kitchens: int | None = Field(
        default=None,
        ge=0,
    )


class FeasibilityScope(BaseModel):
    retaining: bool | None = None
    demolition: bool | None = None
    recladding: bool | None = None
    roofing: bool | None = None
    pool: bool | None = None
    outbuilding: bool | None = None

    secondary_dwelling: bool | None = None
    structural_complexity: bool | None = None
    electrical_upgrade: bool | None = None
    plumbing_upgrade: bool | None = None


class FeasibilityRequest(BaseModel):
    # Optional so the existing frontend keeps working.
    #
    # Later the browser will generate one UUID per browser session
    # and send the same session_id for repeated assessments.
    session_id: UUID | None = None

    project_type: ProjectType

    area: FeasibilityArea
    layout: FeasibilityLayout
    scope: FeasibilityScope

    budget: Decimal | None = Field(
        default=None,
        gt=0,
    )


class FeasibilityEstimate(BaseModel):
    low: Decimal
    typical: Decimal
    high: Decimal

    low_per_sqm: Decimal
    typical_per_sqm: Decimal
    high_per_sqm: Decimal

    pricing_area: Decimal
    pricing_area_basis: str


class FeasibilityBudgetAssessment(BaseModel):
    amount: Decimal

    difference_from_typical: Decimal
    difference_percent: Decimal

    verdict: Literal[
        "feasible",
        "borderline",
        "unlikely",
    ]

    verdict_label: str


class FeasibilityEvidence(BaseModel):
    comparable_count: int

    confidence: Literal[
        "high",
        "medium",
        "low",
        "insufficient",
    ]

    confidence_label: str

    confidence_score: int

    average_similarity: Decimal | None


class FeasibilityAssessment(BaseModel):
    summary: str

    matched_scope_characteristics: list[str]


class FeasibilityResponse(BaseModel):
    # Database identity of this specific assessment.
    #
    # Used by Detailed Review to link the customer request
    # back to the exact automated assessment.
    assessment_id: UUID

    # Anonymous browser/session identity.
    session_id: UUID

    status: Literal[
        "completed",
        "insufficient_data",
    ]

    project_type: ProjectType

    estimate: FeasibilityEstimate | None

    budget: FeasibilityBudgetAssessment | None

    evidence: FeasibilityEvidence

    assessment: FeasibilityAssessment

    assumptions: list[str]