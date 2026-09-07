from fastapi import APIRouter

from app.repositories.feasibility_repository import (
    FeasibilityRepository,
)

from app.schemas.feasibility import (
    FeasibilityRequest,
    FeasibilityResponse,
)

from app.services.feasibility_service import (
    FeasibilityService,
)


router = APIRouter(
    prefix="/api/feasibility",
    tags=["Feasibility"],
)


repository = FeasibilityRepository()

service = FeasibilityService(
    repository
)


@router.post(
    "/assess",
    response_model=FeasibilityResponse,
    response_model_by_alias=True,
)
def assess_feasibility(
    request: FeasibilityRequest,
) -> FeasibilityResponse:
    return service.assess(
        request
    )