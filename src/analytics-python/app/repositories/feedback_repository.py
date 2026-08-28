from typing import Any

from app.db.pool import database_pool


class FeedbackRepository:
    def create_feedback(
        self,
        *,
        user_id: str,
        category: str,
        feature: str | None,
        message: str,
    ) -> dict[str, Any]:
        query = """
            INSERT INTO public."DEV_FEEDBACK" (
                "USER_ID",
                "CATEGORY",
                "FEATURE",
                "MESSAGE"
            )
            VALUES (
                %(user_id)s,
                %(category)s,
                %(feature)s,
                %(message)s
            )
            RETURNING
                "ID" AS id,
                "CATEGORY" AS category,
                "FEATURE" AS feature,
                "MESSAGE" AS message,
                "STATUS" AS status,
                "CREATED_AT" AS created_at;
        """

        parameters = {
            "user_id": user_id,
            "category": category,
            "feature": feature,
            "message": message,
        }

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    parameters,
                )

                row = cursor.fetchone()

        if row is None:
            raise RuntimeError(
                "Failed to create feedback."
            )

        return row


    def get_feedback_for_user(
        self,
        user_id: str,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                "ID" AS id,
                "CATEGORY" AS category,
                "FEATURE" AS feature,
                "MESSAGE" AS message,
                "STATUS" AS status,
                "CREATED_AT" AS created_at
            FROM public."DEV_FEEDBACK"
            WHERE "USER_ID" = %(user_id)s
            ORDER BY "CREATED_AT" DESC;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"user_id": user_id},
                )

                return cursor.fetchall()


    def get_all_feedback(
        self,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                f."ID" AS id,

                f."USER_ID" AS author_id,

                u."NAME" AS author_name,

                u."COMPANY" AS author_company,

                f."CATEGORY" AS category,

                f."FEATURE" AS feature,

                f."MESSAGE" AS message,

                f."STATUS" AS status,

                f."CREATED_AT" AS created_at

            FROM public."DEV_FEEDBACK" f

            INNER JOIN public."APP_USER" u
                ON u."ID" = f."USER_ID"

            ORDER BY
                f."CREATED_AT" DESC;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)

                return cursor.fetchall()