from typing import Any

from app.db.pool import database_pool


class AuthRepository:
    def get_user_by_email(
        self,
        email: str,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                "ID" AS id,
                "NAME" AS name,
                "EMAIL" AS email,
                "PASSWORD_HASH" AS password_hash,
                "COMPANY" AS company,
                "ROLE_TITLE" AS role_title,
                "IS_ACTIVE" AS is_active,
                "CREATED_AT" AS created_at
            FROM public."APP_USER"
            WHERE "EMAIL" = %(email)s
            LIMIT 1;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"email": email},
                )

                return cursor.fetchone()


    def get_user_by_id(
        self,
        user_id: str,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                "ID" AS id,
                "NAME" AS name,
                "EMAIL" AS email,
                "PASSWORD_HASH" AS password_hash,
                "COMPANY" AS company,
                "ROLE_TITLE" AS role_title,
                "IS_ACTIVE" AS is_active,
                "CREATED_AT" AS created_at
            FROM public."APP_USER"
            WHERE "ID" = %(user_id)s
            LIMIT 1;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"user_id": user_id},
                )

                return cursor.fetchone()


    def create_user(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        company: str | None,
        role_title: str | None,
    ) -> dict[str, Any]:
        query = """
            INSERT INTO public."APP_USER" (
                "NAME",
                "EMAIL",
                "PASSWORD_HASH",
                "COMPANY",
                "ROLE_TITLE"
            )
            VALUES (
                %(name)s,
                %(email)s,
                %(password_hash)s,
                %(company)s,
                %(role_title)s
            )
            RETURNING
                "ID" AS id,
                "NAME" AS name,
                "EMAIL" AS email,
                "PASSWORD_HASH" AS password_hash,
                "COMPANY" AS company,
                "ROLE_TITLE" AS role_title,
                "IS_ACTIVE" AS is_active,
                "CREATED_AT" AS created_at;
        """

        parameters = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "company": company,
            "role_title": role_title,
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
                "Failed to create user."
            )

        return row