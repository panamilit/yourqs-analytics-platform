from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from app.db.pool import database_pool

from app.schemas.feasibility_review import (
    FeasibilityReviewRequestData,
)


class FeasibilityReviewRepository:
    def create_review_request(
        self,
        review_request_id: UUID,
        assessment: dict[str, Any],
        request: FeasibilityReviewRequestData,
    ) -> None:
        query = """
            INSERT INTO public."FEASIBILITY_REVIEW_REQUEST" (
                id,

                assessment_id,
                session_id,

                first_name,
                last_name,
                email,
                phone,

                location,
                postcode,

                project_description,
                additional_comments,
                timeframe,

                project_type,

                floor_area,
                affected_area,

                levels,
                bathrooms,
                kitchens,

                budget,
                scope_json,

                status,
                consent_to_contact
            )
            VALUES (
                %(id)s,

                %(assessment_id)s,
                %(session_id)s,

                %(first_name)s,
                %(last_name)s,
                %(email)s,
                %(phone)s,

                %(location)s,
                %(postcode)s,

                %(project_description)s,
                %(additional_comments)s,
                %(timeframe)s,

                %(project_type)s,

                %(floor_area)s,
                %(affected_area)s,

                %(levels)s,
                %(bathrooms)s,
                %(kitchens)s,

                %(budget)s,
                %(scope_json)s,

                'new',
                %(consent_to_contact)s
            );
        """

        params = {
            "id": review_request_id,

            "assessment_id": (
                request.assessment_id
            ),

            "session_id": (
                assessment["session_id"]
            ),

            "first_name": (
                request.first_name.strip()
            ),

            "last_name": (
                request.last_name.strip()
            ),

            "email": str(
                request.email
            ).strip(),

            "phone": self._optional_text(
                request.phone
            ),

            "location": self._optional_text(
                request.location
            ),

            "postcode": self._optional_text(
                request.postcode
            ),

            "project_description": (
                request.project_description.strip()
            ),

            "additional_comments": (
                self._optional_text(
                    request.additional_comments
                )
            ),

            "timeframe": request.timeframe,

            "project_type": (
                assessment["project_type"]
            ),

            "floor_area": (
                assessment["floor_area"]
            ),

            "affected_area": (
                assessment["affected_area"]
            ),

            "levels": (
                assessment["levels"]
            ),

            "bathrooms": (
                assessment["bathrooms"]
            ),

            "kitchens": (
                assessment["kitchens"]
            ),

            "budget": (
                assessment["budget"]
            ),

            "scope_json": Jsonb(
                assessment["scope_json"]
                or {}
            ),

            "consent_to_contact": (
                request.consent_to_contact
            ),
        }

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    params,
                )

            connection.commit()

    def create_file_record(
        self,
        file_id: UUID,
        review_request_id: UUID,
        original_file_name: str,
        storage_path: str,
        mime_type: str,
        file_size: int,
    ) -> None:
        query = """
            INSERT INTO public."FEASIBILITY_REVIEW_FILE" (
                id,
                review_request_id,

                original_file_name,
                storage_path,
                mime_type,
                file_size
            )
            VALUES (
                %(id)s,
                %(review_request_id)s,

                %(original_file_name)s,
                %(storage_path)s,
                %(mime_type)s,
                %(file_size)s
            );
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "id": file_id,

                        "review_request_id": (
                            review_request_id
                        ),

                        "original_file_name": (
                            original_file_name
                        ),

                        "storage_path": (
                            storage_path
                        ),

                        "mime_type": (
                            mime_type
                        ),

                        "file_size": (
                            file_size
                        ),
                    },
                )

            connection.commit()

    def delete_review_request(
        self,
        review_request_id: UUID,
    ) -> None:
        query = """
            DELETE
            FROM public."FEASIBILITY_REVIEW_REQUEST"
            WHERE id = %(review_request_id)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "review_request_id": (
                            review_request_id
                        ),
                    },
                )

            connection.commit()

    @staticmethod
    def _optional_text(
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()

        return cleaned or None