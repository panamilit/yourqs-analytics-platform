import re
from pathlib import Path
from uuid import (
    UUID,
    uuid4,
)

from fastapi import (
    HTTPException,
    UploadFile,
)

from app.core.config import get_settings

from app.repositories.feasibility_repository import (
    FeasibilityRepository,
)

from app.repositories.feasibility_review_repository import (
    FeasibilityReviewRepository,
)

from app.schemas.feasibility_review import (
    FeasibilityReviewFileResponse,
    FeasibilityReviewRequestData,
    FeasibilityReviewResponse,
)

from app.services.feasibility_storage_service import (
    FeasibilityStorageService,
)


class FeasibilityReviewService:
    ALLOWED_MIME_TYPES = {
        "application/pdf",

        (
            "application/vnd.openxmlformats-"
            "officedocument.wordprocessingml.document"
        ),

        (
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),

        "image/jpeg",
        "image/png",
        "image/webp",
    }

    ALLOWED_EXTENSIONS = {
        ".pdf",
        ".docx",
        ".xlsx",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }

    def __init__(
        self,
        feasibility_repository: (
            FeasibilityRepository
        ),
        review_repository: (
            FeasibilityReviewRepository
        ),
        storage_service: (
            FeasibilityStorageService
        ),
    ) -> None:
        self.feasibility_repository = (
            feasibility_repository
        )

        self.review_repository = (
            review_repository
        )

        self.storage_service = (
            storage_service
        )

        settings = get_settings()

        self.max_files = (
            settings.feasibility_max_files
        )

        self.max_file_size = (
            settings.feasibility_max_file_size_bytes
        )

    async def create_review_request(
        self,
        request: FeasibilityReviewRequestData,
        files: list[UploadFile],
    ) -> FeasibilityReviewResponse:
        if not request.consent_to_contact:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Consent to contact is required "
                    "to request a detailed review."
                ),
            )

        assessment = (
            self.feasibility_repository
            .get_assessment_log(
                request.assessment_id
            )
        )

        if assessment is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "The feasibility assessment "
                    "could not be found."
                ),
            )

        clean_files = [
            file
            for file in files
            if (
                file is not None
                and file.filename
            )
        ]

        if len(clean_files) > self.max_files:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"A maximum of "
                    f"{self.max_files} files "
                    f"can be uploaded."
                ),
            )

        review_request_id = uuid4()

        # ------------------------------------------------------
        # Create lead first
        # ------------------------------------------------------

        self.review_repository.create_review_request(
            review_request_id=(
                review_request_id
            ),
            assessment=assessment,
            request=request,
        )

        uploaded_paths: list[str] = []

        uploaded_files: list[
            FeasibilityReviewFileResponse
        ] = []

        try:
            for upload in clean_files:
                validated = (
                    await self._read_and_validate_file(
                        upload
                    )
                )

                file_id = uuid4()

                storage_path = (
                    self._build_storage_path(
                        review_request_id=(
                            review_request_id
                        ),
                        file_id=file_id,
                        filename=(
                            validated["filename"]
                        ),
                    )
                )

                self.storage_service.upload(
                    storage_path=storage_path,
                    content=validated["content"],
                    mime_type=validated["mime_type"],
                )

                uploaded_paths.append(
                    storage_path
                )

                self.review_repository.create_file_record(
                    file_id=file_id,

                    review_request_id=(
                        review_request_id
                    ),

                    original_file_name=(
                        validated["filename"]
                    ),

                    storage_path=(
                        storage_path
                    ),

                    mime_type=(
                        validated["mime_type"]
                    ),

                    file_size=(
                        validated["file_size"]
                    ),
                )

                uploaded_files.append(
                    FeasibilityReviewFileResponse(
                        id=file_id,

                        file_name=(
                            validated["filename"]
                        ),

                        mime_type=(
                            validated["mime_type"]
                        ),

                        file_size=(
                            validated["file_size"]
                        ),
                    )
                )

        except Exception:
            # --------------------------------------------------
            # Compensating cleanup
            #
            # If one upload fails halfway through:
            # - remove already-uploaded Storage objects
            # - delete the review request
            # - file metadata disappears through ON DELETE CASCADE
            # --------------------------------------------------

            self.storage_service.remove(
                uploaded_paths
            )

            self.review_repository.delete_review_request(
                review_request_id
            )

            raise

        return FeasibilityReviewResponse(
            review_request_id=(
                review_request_id
            ),

            assessment_id=(
                request.assessment_id
            ),

            status="new",

            uploaded_files=(
                uploaded_files
            ),

            message=(
                "Your detailed review request "
                "has been submitted."
            ),
        )

    async def _read_and_validate_file(
        self,
        upload: UploadFile,
    ) -> dict:
        original_filename = (
            Path(
                upload.filename or ""
            ).name
        )

        if not original_filename:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Uploaded file has "
                    "no valid filename."
                ),
            )

        extension = (
            Path(
                original_filename
            )
            .suffix
            .lower()
        )

        if (
            extension
            not in self.ALLOWED_EXTENSIONS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unsupported file type: "
                    f"{original_filename}"
                ),
            )

        mime_type = (
            upload.content_type
            or "application/octet-stream"
        )

        if (
            mime_type
            not in self.ALLOWED_MIME_TYPES
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unsupported file type: "
                    f"{original_filename}"
                ),
            )

        content = await upload.read(
            self.max_file_size + 1
        )

        if not content:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"{original_filename} "
                    f"is empty."
                ),
            )

        if (
            len(content)
            > self.max_file_size
        ):
            max_mb = (
                self.max_file_size
                // 1024
                // 1024
            )

            raise HTTPException(
                status_code=422,
                detail=(
                    f"{original_filename} exceeds "
                    f"the {max_mb} MB file limit."
                ),
            )

        return {
            "filename": original_filename,
            "mime_type": mime_type,
            "file_size": len(content),
            "content": content,
        }

    @staticmethod
    def _build_storage_path(
        review_request_id: UUID,
        file_id: UUID,
        filename: str,
    ) -> str:
        safe_name = re.sub(
            r"[^A-Za-z0-9._-]+",
            "-",
            filename,
        )

        safe_name = (
            safe_name.strip(".-_")
            or "document"
        )

        safe_name = safe_name[
            :180
        ]

        return (
            f"{review_request_id}/"
            f"{file_id}-"
            f"{safe_name}"
        )