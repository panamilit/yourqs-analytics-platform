from fastapi import HTTPException

from app.repositories.project_details_repository import (
    ProjectDetailsRepository,
)
from app.schemas.project_details import (
    CostBreakdownItem,
    ProjectDetailsResponse,
)
from app.schemas.projects import ProjectItem


class ProjectDetailsService:
    def __init__(
        self,
        repository: ProjectDetailsRepository,
    ) -> None:
        self.repository = repository

    def get_project_details(
        self,
        project_id: str,
    ) -> ProjectDetailsResponse:
        project_row = self.repository.get_project_summary(
            project_id
        )

        if project_row is None:
            raise HTTPException(
                status_code=404,
                detail="Project not found.",
            )

        breakdown_rows = (
            self.repository.get_cost_breakdown(project_id)
        )

        breakdown = [
            CostBreakdownItem(**row)
            for row in breakdown_rows
        ]

        return ProjectDetailsResponse(
            project=ProjectItem(**project_row),
            cost_breakdown=breakdown,
            top_cost_drivers=breakdown[:5],
        )