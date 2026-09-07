from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
)

from app.repositories.feasibility_repository import (
    FeasibilityRepository,
)

from app.repositories.feasibility_review_repository import (
    FeasibilityReviewRepository,
)

from app.schemas.feasibility import (
    FeasibilityRequest,
    FeasibilityResponse,
)

from app.schemas.feasibility_review import (
    FeasibilityReviewRequestData,
    FeasibilityReviewResponse,
)

from app.services.feasibility_review_service import (
    FeasibilityReviewService,
)

from app.services.feasibility_service import (
    FeasibilityService,
)

from app.services.feasibility_storage_service import (
    FeasibilityStorageService,
)


router = APIRouter(
    prefix="/api/feasibility",
    tags=["Feasibility"],
)


# ==============================================================
# Dependencies / services
# ==============================================================

feasibility_repository = (
    FeasibilityRepository()
)

review_repository = (
    FeasibilityReviewRepository()
)

storage_service = (
    FeasibilityStorageService()
)


feasibility_service = (
    FeasibilityService(
        feasibility_repository
    )
)

review_service = (
    FeasibilityReviewService(
        feasibility_repository=(
            feasibility_repository
        ),

        review_repository=(
            review_repository
        ),

        storage_service=(
            storage_service
        ),
    )
)


# ==============================================================
# Public automated feasibility assessment
# ==============================================================

@router.post(
    "/assess",
    response_model=FeasibilityResponse,
    response_model_by_alias=True,
)
def assess_feasibility(
    request: FeasibilityRequest,
) -> FeasibilityResponse:
    return feasibility_service.assess(
        request
    )


# ==============================================================
# Public detailed review request
#
# multipart/form-data because it can include project files.
# ==============================================================

@router.post(
    "/review-requests",
    response_model=FeasibilityReviewResponse,
)
async def create_review_request(
    assessment_id: Annotated[
        str,
        Form(),
    ],

    first_name: Annotated[
        str,
        Form(),
    ],

    last_name: Annotated[
        str,
        Form(),
    ],

    email: Annotated[
        str,
        Form(),
    ],

    project_description: Annotated[
        str,
        Form(),
    ],

    consent_to_contact: Annotated[
        bool,
        Form(),
    ],

    file: UploadFile = File(
        ...
    ),

    phone: Annotated[
        str | None,
        Form(),
    ] = None,

    location: Annotated[
        str | None,
        Form(),
    ] = None,

    postcode: Annotated[
        str | None,
        Form(),
    ] = None,

    additional_comments: Annotated[
        str | None,
        Form(),
    ] = None,

    timeframe: Annotated[
        str | None,
        Form(),
    ] = None,
) -> FeasibilityReviewResponse:
    request = FeasibilityReviewRequestData(
        assessment_id=assessment_id,

        first_name=first_name,
        last_name=last_name,

        email=email,
        phone=phone,

        location=location,
        postcode=postcode,

        project_description=(
            project_description
        ),

        additional_comments=(
            additional_comments
        ),

        timeframe=timeframe,

        consent_to_contact=(
            consent_to_contact
        ),
    )

    return await review_service.create_review_request(
        request=request,
        files=[
            file,
        ],
    )