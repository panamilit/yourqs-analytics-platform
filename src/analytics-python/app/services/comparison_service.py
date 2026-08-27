from fastapi import HTTPException

from app.repositories.comparison_repository import (
    ComparisonRepository,
)
from app.schemas.comparison import (
    ComparisonProject,
    ComparisonScope,
    ProjectsComparisonResponse,
)


class ComparisonService:
    MIN_PROJECTS = 2
    MAX_PROJECTS = 4

    def __init__(
        self,
        repository: ComparisonRepository,
    ) -> None:
        self.repository = repository

    def compare_projects(
        self,
        project_ids: list[str],
    ) -> ProjectsComparisonResponse:

        unique_ids = list(dict.fromkeys(project_ids))

        if not (
            self.MIN_PROJECTS
            <= len(unique_ids)
            <= self.MAX_PROJECTS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Select between 2 and 4 "
                    "different projects for comparison."
                ),
            )

        rows = self.repository.get_projects(
            unique_ids
        )

        if len(rows) != len(unique_ids):
            found_ids = {
                row["project_id"]
                for row in rows
            }

            missing_ids = [
                project_id
                for project_id in unique_ids
                if project_id not in found_ids
            ]

            raise HTTPException(
                status_code=404,
                detail={
                    "message": "One or more projects were not found.",
                    "missingProjectIds": missing_ids,
                },
            )

        projects = []

        for row in rows:
            scope_rows = (
                self.repository.get_top_scopes(
                    row["project_id"],
                    limit=5,
                )
            )

            projects.append(
                ComparisonProject(
                    **row,
                    top_scopes=[
                        ComparisonScope(**scope)
                        for scope in scope_rows
                    ],
                )
            )

        # Preserve the project order sent by the frontend.
        project_order = {
            project_id: index
            for index, project_id
            in enumerate(unique_ids)
        }

        projects.sort(
            key=lambda project:
                project_order[project.project_id]
        )

        return ProjectsComparisonResponse(
            projects=projects
        )