from fastapi import (
    APIRouter,
    Depends,
)

from app.dependencies.current_user import (
    get_current_user,
)
from app.repositories.feedback_repository import (
    FeedbackRepository,
)
from app.schemas.auth import UserResponse
from app.schemas.feedback import (
    FeedbackCreateRequest,
    FeedbackItem,
    FeedbackListResponse,
    PublicFeedbackListResponse,
)
from app.services.feedback_service import (
    FeedbackService,
)


router = APIRouter(
    prefix="/api/feedback",
    tags=["Feedback"],
)

repository = FeedbackRepository()
service = FeedbackService(repository)


@router.post(
    "",
    response_model=FeedbackItem,
    response_model_by_alias=True,
    status_code=201,
)
def create_feedback(
    request: FeedbackCreateRequest,
    user: UserResponse = Depends(
        get_current_user
    ),
) -> FeedbackItem:
    return service.create_feedback(
        user_id=str(user.id),
        request=request,
    )


@router.get(
    "",
    response_model=PublicFeedbackListResponse,
    response_model_by_alias=True,
)
def get_all_feedback(
    user: UserResponse = Depends(
        get_current_user
    ),
) -> PublicFeedbackListResponse:
    return service.get_all_feedback()


@router.get(
    "/me",
    response_model=FeedbackListResponse,
    response_model_by_alias=True,
)
def get_my_feedback(
    user: UserResponse = Depends(
        get_current_user
    ),
) -> FeedbackListResponse:
    return service.get_my_feedback(
        str(user.id)
    )