from app.repositories.feedback_repository import (
    FeedbackRepository,
)
from app.schemas.feedback import (
    FeedbackCreateRequest,
    FeedbackItem,
    FeedbackListResponse,
    PublicFeedbackItem,
    PublicFeedbackListResponse,
)


class FeedbackService:
    def __init__(
        self,
        repository: FeedbackRepository,
    ) -> None:
        self.repository = repository


    def create_feedback(
        self,
        *,
        user_id: str,
        request: FeedbackCreateRequest,
    ) -> FeedbackItem:
        feature = (
            request.feature.strip()
            if request.feature
            else None
        )

        message = request.message.strip()

        row = self.repository.create_feedback(
            user_id=user_id,
            category=request.category,
            feature=feature,
            message=message,
        )

        return FeedbackItem(**row)


    def get_my_feedback(
        self,
        user_id: str,
    ) -> FeedbackListResponse:
        rows = (
            self.repository.get_feedback_for_user(
                user_id
            )
        )

        return FeedbackListResponse(
            items=[
                FeedbackItem(**row)
                for row in rows
            ]
        )


    def get_all_feedback(
        self,
    ) -> PublicFeedbackListResponse:
        rows = (
            self.repository.get_all_feedback()
        )

        return PublicFeedbackListResponse(
            items=[
                PublicFeedbackItem(**row)
                for row in rows
            ]
        )