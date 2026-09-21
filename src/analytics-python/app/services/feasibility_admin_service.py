from math import ceil
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.repositories.feasibility_admin_repository import (
    FeasibilityAdminRepository,
)

from app.schemas.feasibility_admin import (
    FeasibilityAdminOverviewResponse,
    FeasibilityAssessmentAdminDetail,
    FeasibilityAssessmentAdminPage,
    FeasibilityReviewAdminDetail,
    FeasibilityReviewAdminFile,
    FeasibilityReviewAdminPage,
    FeasibilityReviewStatusResponse,
)

from app.services.feasibility_storage_service import (
    FeasibilityStorageService,
)


class FeasibilityAdminService:
    def __init__(
        self,
        repository: FeasibilityAdminRepository,
        storage_service: FeasibilityStorageService,
    ) -> None:
        self.repository = repository
        self.storage_service = storage_service

    def get_overview(
        self,
    ) -> FeasibilityAdminOverviewResponse:
        overview = (
            self.repository.get_overview()
        )

        return FeasibilityAdminOverviewResponse(
            **overview,

            project_type_distribution=(
                self.repository
                .get_project_type_distribution()
            ),

            verdict_distribution=(
                self.repository
                .get_verdict_distribution()
            ),

            confidence_distribution=(
                self.repository
                .get_confidence_distribution()
            ),
        )

    def get_assessments(
        self,
        *,
        project_type: str | None,
        assessment_status: str | None,
        verdict: str | None,
        confidence: str | None,
        page: int,
        page_size: int,
    ) -> FeasibilityAssessmentAdminPage:
        rows, total = (
            self.repository.get_assessments(
                project_type=project_type,
                assessment_status=assessment_status,
                verdict=verdict,
                confidence=confidence,
                page=page,
                page_size=page_size,
            )
        )

        total_pages = (
            ceil(
                total / page_size
            )
            if total > 0
            else 0
        )

        return FeasibilityAssessmentAdminPage(
            items=rows,
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=total_pages,
        )

    def get_assessment_detail(
        self,
        assessment_id: UUID,
    ) -> FeasibilityAssessmentAdminDetail:
        row = (
            self.repository
            .get_assessment_detail(
                assessment_id
            )
        )

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Feasibility assessment "
                    "not found."
                ),
            )

        return FeasibilityAssessmentAdminDetail(
            **row
        )

    def get_review_requests(
        self,
        *,
        status: str | None,
        project_type: str | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> FeasibilityReviewAdminPage:
        rows, total = (
            self.repository
            .get_review_requests(
                status=status,
                project_type=project_type,
                search=search,
                page=page,
                page_size=page_size,
            )
        )

        total_pages = (
            ceil(
                total / page_size
            )
            if total > 0
            else 0
        )

        return FeasibilityReviewAdminPage(
            items=rows,
            page=page,
            page_size=page_size,
            total_items=total,
            total_pages=total_pages,
        )

    def get_review_detail(
        self,
        review_request_id: UUID,
    ) -> FeasibilityReviewAdminDetail:
        row = (
            self.repository
            .get_review_detail(
                review_request_id
            )
        )

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Detailed review request "
                    "not found."
                ),
            )

        files = (
            self.repository
            .get_review_files(
                review_request_id
            )
        )

        file_models = [
            FeasibilityReviewAdminFile(
                id=file["id"],
                uploaded_at=(
                    file["uploaded_at"]
                ),
                file_name=(
                    file[
                        "original_file_name"
                    ]
                ),
                mime_type=(
                    file["mime_type"]
                ),
                file_size=(
                    file["file_size"]
                ),
            )
            for file in files
        ]

        return FeasibilityReviewAdminDetail(
            **row,
            files=file_models,
        )

    def update_review_status(
        self,
        review_request_id: UUID,
        status: str,
    ) -> FeasibilityReviewStatusResponse:
        row = (
            self.repository
            .update_review_status(
                review_request_id,
                status,
            )
        )

        if row is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Detailed review request "
                    "not found."
                ),
            )

        return FeasibilityReviewStatusResponse(
            **row
        )

    def get_file_download(
        self,
        file_id: UUID,
    ) -> tuple[
        bytes,
        str,
        str,
    ]:
        file = (
            self.repository
            .get_file(
                file_id
            )
        )

        if file is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Review file not found."
                ),
            )

        content = (
            self.storage_service.download(
                file["storage_path"]
            )
        )

        return (
            content,
            file["original_file_name"],
            file["mime_type"],
        )