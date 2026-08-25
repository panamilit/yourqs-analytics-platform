from typing import Literal

from fastapi import APIRouter, Query

from app.repositories.projects_repository import (
    SORT_COLUMNS,
    ProjectsRepository,
)
from app.schemas.projects import (
    ProjectsPageResponse,
    ProjectsSummaryResponse,
)
from app.services.projects_service import ProjectsService

from app.repositories.project_details_repository import (
    ProjectDetailsRepository,
)
from app.schemas.project_details import (
    ProjectDetailsResponse,
)
from app.services.project_details_service import (
    ProjectDetailsService,
)


router = APIRouter(
    prefix="/api/projects",
    tags=["Projects"],
)

repository = ProjectsRepository()
service = ProjectsService(repository)

details_repository = ProjectDetailsRepository()
details_service = ProjectDetailsService(
    details_repository
)


@router.get(
    "/summary",
    response_model=ProjectsSummaryResponse,
    response_model_by_alias=True,
)
def get_projects_summary() -> ProjectsSummaryResponse:
    return service.get_summary()


@router.get(
    "",
    response_model=ProjectsPageResponse,
    response_model_by_alias=True,
)
def get_projects(
    search: str | None = Query(
        default=None,
        max_length=200,
    ),
    min_floor_area: float | None = Query(
        default=None,
        ge=0,
    ),
    max_floor_area: float | None = Query(
        default=None,
        ge=0,
    ),
    levels: int | None = Query(
        default=None,
        ge=0,
    ),
    has_cost_data: bool | None = None,
    analytics_ready: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    sort_by: str = Query(default="project_name"),
    sort_order: Literal["asc", "desc"] = "asc",
) -> ProjectsPageResponse:
    if sort_by not in SORT_COLUMNS:
        # FastAPI will return this as an ordinary unhandled error
        # unless we use HTTPException.
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid sort field.",
                "allowedValues": list(SORT_COLUMNS),
            },
        )

    if (
        min_floor_area is not None
        and max_floor_area is not None
        and min_floor_area > max_floor_area
    ):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail="Minimum floor area cannot exceed maximum floor area.",
        )

    return service.get_projects(
        search=search,
        min_floor_area=min_floor_area,
        max_floor_area=max_floor_area,
        levels=levels,
        has_cost_data=has_cost_data,
        analytics_ready=analytics_ready,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{project_id}/details",
    response_model=ProjectDetailsResponse,
    response_model_by_alias=True,
)
def get_project_details(
    project_id: str,
) -> ProjectDetailsResponse:
    return details_service.get_project_details(
        project_id
    )