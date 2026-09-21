from typing import Literal
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Response,
)

from app.dependencies.current_user import (
    get_current_user,
)

from app.repositories.feasibility_admin_repository import (
    FeasibilityAdminRepository,
)

from app.schemas.feasibility_admin import (
    FeasibilityAdminOverviewResponse,
    FeasibilityAssessmentAdminDetail,
    FeasibilityAssessmentAdminPage,
    FeasibilityReviewAdminDetail,
    FeasibilityReviewAdminPage,
    FeasibilityReviewStatusResponse,
    FeasibilityReviewStatusUpdate,
)

from app.services.feasibility_admin_service import (
    FeasibilityAdminService,
)

from app.services.feasibility_storage_service import (
    FeasibilityStorageService,
)


router = APIRouter(
    prefix="/api/feasibility/admin",
    tags=[
        "Feasibility Admin"
    ],
    dependencies=[
        Depends(
            get_current_user
        )
    ],
)


repository = (
    FeasibilityAdminRepository()
)

storage_service = (
    FeasibilityStorageService()
)

service = (
    FeasibilityAdminService(
        repository=repository,
        storage_service=storage_service,
    )
)


@router.get(
    "/overview",
    response_model=(
        FeasibilityAdminOverviewResponse
    ),
)
def get_feasibility_overview(
) -> FeasibilityAdminOverviewResponse:
    return service.get_overview()


@router.get(
    "/assessments",
    response_model=(
        FeasibilityAssessmentAdminPage
    ),
)
def get_assessments(
    project_type: (
        str | None
    ) = Query(
        default=None,
    ),

    assessment_status: (
        Literal[
            "completed",
            "insufficient_data",
        ]
        | None
    ) = Query(
        default=None,
    ),

    verdict: (
        Literal[
            "feasible",
            "borderline",
            "unlikely",
        ]
        | None
    ) = Query(
        default=None,
    ),

    confidence: (
        Literal[
            "high",
            "medium",
            "low",
            "insufficient",
        ]
        | None
    ) = Query(
        default=None,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    page_size: int = Query(
        default=25,
        ge=1,
        le=100,
    ),
) -> FeasibilityAssessmentAdminPage:
    return service.get_assessments(
        project_type=project_type,
        assessment_status=assessment_status,
        verdict=verdict,
        confidence=confidence,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/assessments/{assessment_id}",
    response_model=(
        FeasibilityAssessmentAdminDetail
    ),
)
def get_assessment_detail(
    assessment_id: UUID,
) -> FeasibilityAssessmentAdminDetail:
    return service.get_assessment_detail(
        assessment_id
    )


@router.get(
    "/review-requests",
    response_model=(
        FeasibilityReviewAdminPage
    ),
)
def get_review_requests(
    status: (
        Literal[
            "new",
            "reviewing",
            "contacted",
            "completed",
            "closed",
        ]
        | None
    ) = Query(
        default=None,
    ),

    project_type: (
        str | None
    ) = Query(
        default=None,
    ),

    search: (
        str | None
    ) = Query(
        default=None,
        max_length=200,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    page_size: int = Query(
        default=25,
        ge=1,
        le=100,
    ),
) -> FeasibilityReviewAdminPage:
    return service.get_review_requests(
        status=status,
        project_type=project_type,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/review-requests/{review_request_id}",
    response_model=(
        FeasibilityReviewAdminDetail
    ),
)
def get_review_detail(
    review_request_id: UUID,
) -> FeasibilityReviewAdminDetail:
    return service.get_review_detail(
        review_request_id
    )


@router.patch(
    "/review-requests/{review_request_id}/status",
    response_model=(
        FeasibilityReviewStatusResponse
    ),
)
def update_review_status(
    review_request_id: UUID,
    request: FeasibilityReviewStatusUpdate,
) -> FeasibilityReviewStatusResponse:
    return service.update_review_status(
        review_request_id=review_request_id,
        status=request.status,
    )


@router.get(
    "/files/{file_id}/download",
)
def download_review_file(
    file_id: UUID,
) -> Response:
    (
        content,
        filename,
        mime_type,
    ) = service.get_file_download(
        file_id
    )

    safe_filename = (
        filename
        .replace(
            '"',
            ""
        )
        .replace(
            "\r",
            ""
        )
        .replace(
            "\n",
            ""
        )
    )

    return Response(
        content=content,
        media_type=mime_type,
        headers={
            "Content-Disposition": (
                "attachment; "
                f'filename="{safe_filename}"'
            ),
        },
    )