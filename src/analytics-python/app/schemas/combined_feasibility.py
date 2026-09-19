from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.feasibility import (
    FeasibilityArea,
    FeasibilityLayout,
    FeasibilityScope,
)


class CombinedFeasibilityPart(BaseModel):
    area: FeasibilityArea
    layout: FeasibilityLayout
    scope: FeasibilityScope

    @model_validator(mode="after")
    def check_affected_area(self):
        # each part needs its own area, not just the whole house size
        if self.area.affected_area is None:
            raise ValueError("Enter the area for this part of the work.")
        return self


class CombinedFeasibilityRequest(BaseModel):
    project_type: Literal["renovation_and_extension"] = "renovation_and_extension"
    session_id: UUID | None = None

    # keep the two sets of answers separate
    renovation: CombinedFeasibilityPart
    extension: CombinedFeasibilityPart

    # this budget covers both parts together
    budget: Decimal | None = Field(default=None, gt=0)
