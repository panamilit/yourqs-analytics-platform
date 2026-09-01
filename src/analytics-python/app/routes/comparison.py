from fastapi import APIRouter, Depends

from app.dependencies.current_user import get_current_user

from pydantic import BaseModel, Field

from app.repositories.comparison_repository import (
    ComparisonRepository,
)
from app.schemas.comparison import (
    ProjectsComparisonResponse,
)
from app.services.comparison_service import (
    ComparisonService,
)


router = APIRouter(
    prefix="/api/comparison",
    tags=["Compare Projects"],
    dependencies=[Depends(get_current_user)],
)


class CompareProjectsRequest(BaseModel):
    project_ids: list[str] = Field(
        serialization_alias="projectIds",
        validation_alias="projectIds",
        min_length=2,
        max_length=4,
    )


repository = ComparisonRepository()
service = ComparisonService(repository)


@router.post(
    "/projects",
    response_model=ProjectsComparisonResponse,
    response_model_by_alias=True,
)
def compare_projects(
    request: CompareProjectsRequest,
) -> ProjectsComparisonResponse:
    return service.compare_projects(
        request.project_ids
    )