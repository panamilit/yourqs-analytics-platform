import math
from typing import Any

from app.repositories.projects_repository import ProjectsRepository
from app.schemas.projects import (
    ProjectItem,
    ProjectsPageResponse,
    ProjectsSummaryResponse,
)


class ProjectsService:
    def __init__(self, repository: ProjectsRepository) -> None:
        self.repository = repository

    def get_summary(self) -> ProjectsSummaryResponse:
        row = self.repository.get_summary()
        return ProjectsSummaryResponse(**row)

    def get_projects(
        self,
        **filters: Any,
    ) -> ProjectsPageResponse:
        items, total_items = self.repository.get_projects(**filters)

        page = filters["page"]
        page_size = filters["page_size"]

        total_pages = (
            math.ceil(total_items / page_size)
            if total_items > 0
            else 1
        )

        return ProjectsPageResponse(
            items=[ProjectItem(**item) for item in items],
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        )