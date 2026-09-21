from typing import Any
from uuid import UUID

from app.db.pool import database_pool


class FeasibilityAdminRepository:
    def get_overview(
        self,
    ) -> dict[str, Any]:
        query = """
            WITH assessment_stats AS (
                SELECT
                    COUNT(*) AS total_assessments,

                    COUNT(*) FILTER (
                        WHERE created_at::date = CURRENT_DATE
                    ) AS assessments_today,

                    COUNT(*) FILTER (
                        WHERE created_at >= NOW() - INTERVAL '7 days'
                    ) AS assessments_last_7_days,

                    COUNT(*) FILTER (
                        WHERE created_at >= NOW() - INTERVAL '30 days'
                    ) AS assessments_last_30_days,

                    COUNT(
                        DISTINCT session_id
                    ) AS unique_sessions,

                    COUNT(*) FILTER (
                        WHERE assessment_status = 'completed'
                    ) AS completed_assessments,

                    COUNT(*) FILTER (
                        WHERE assessment_status = 'insufficient_data'
                    ) AS insufficient_data_assessments,

                    AVG(
                        confidence_score
                    ) FILTER (
                        WHERE confidence_score IS NOT NULL
                    ) AS average_confidence_score

                FROM public."FEASIBILITY_ASSESSMENT_LOG"
            ),

            review_stats AS (
                SELECT
                    COUNT(*) AS detailed_review_requests,

                    COUNT(*) FILTER (
                        WHERE status = 'new'
                    ) AS new_review_requests

                FROM public."FEASIBILITY_REVIEW_REQUEST"
            )

            SELECT
                a.*,

                r.detailed_review_requests,

                r.new_review_requests,

                CASE
                    WHEN a.total_assessments = 0
                    THEN NULL

                    ELSE ROUND(
                        (
                            r.detailed_review_requests::numeric
                            /
                            a.total_assessments::numeric
                        ) * 100,
                        2
                    )
                END AS review_conversion_percent

            FROM assessment_stats a

            CROSS JOIN review_stats r;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query
                )

                row = cursor.fetchone()

        return row

    def get_project_type_distribution(
        self,
    ) -> dict[str, int]:
        query = """
            SELECT
                project_type,
                COUNT(*) AS total

            FROM public."FEASIBILITY_ASSESSMENT_LOG"

            GROUP BY project_type

            ORDER BY project_type;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query
                )

                rows = cursor.fetchall()

        return {
            row["project_type"]: (
                row["total"]
            )
            for row in rows
        }

    def get_verdict_distribution(
        self,
    ) -> dict[str, int]:
        query = """
            SELECT
                COALESCE(
                    verdict,
                    'none'
                ) AS verdict,

                COUNT(*) AS total

            FROM public."FEASIBILITY_ASSESSMENT_LOG"

            GROUP BY
                COALESCE(
                    verdict,
                    'none'
                )

            ORDER BY verdict;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query
                )

                rows = cursor.fetchall()

        return {
            row["verdict"]: (
                row["total"]
            )
            for row in rows
        }

    def get_confidence_distribution(
        self,
    ) -> dict[str, int]:
        query = """
            SELECT
                confidence,
                COUNT(*) AS total

            FROM public."FEASIBILITY_ASSESSMENT_LOG"

            GROUP BY confidence

            ORDER BY confidence;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query
                )

                rows = cursor.fetchall()

        return {
            row["confidence"]: (
                row["total"]
            )
            for row in rows
        }

    def get_assessments(
        self,
        *,
        project_type: str | None,
        assessment_status: str | None,
        verdict: str | None,
        confidence: str | None,
        page: int,
        page_size: int,
    ) -> tuple[
        list[dict[str, Any]],
        int,
    ]:
        conditions: list[str] = []

        params: dict[str, Any] = {}

        if project_type:
            conditions.append(
                'a.project_type = %(project_type)s'
            )

            params[
                "project_type"
            ] = project_type

        if assessment_status:
            conditions.append(
                'a.assessment_status = %(assessment_status)s'
            )

            params[
                "assessment_status"
            ] = assessment_status

        if verdict:
            conditions.append(
                'a.verdict = %(verdict)s'
            )

            params[
                "verdict"
            ] = verdict

        if confidence:
            conditions.append(
                'a.confidence = %(confidence)s'
            )

            params[
                "confidence"
            ] = confidence

        where_clause = ""

        if conditions:
            where_clause = (
                "WHERE "
                + " AND ".join(
                    conditions
                )
            )

        offset = (
            page - 1
        ) * page_size

        params.update(
            {
                "limit": (
                    page_size
                ),

                "offset": (
                    offset
                ),
            }
        )

        count_query = f"""
            SELECT
                COUNT(*) AS total

            FROM public."FEASIBILITY_ASSESSMENT_LOG" a

            {where_clause};
        """

        data_query = f"""
            SELECT
                a.id,
                a.created_at,
                a.session_id,

                a.project_type,

                a.floor_area,
                a.affected_area,

                a.levels,
                a.bathrooms,
                a.kitchens,

                a.budget,

                a.assessment_status,

                a.estimate_typical,

                a.verdict,

                a.confidence,
                a.confidence_score,

                a.comparable_count,
                a.average_similarity,

                EXISTS (
                    SELECT 1

                    FROM public."FEASIBILITY_REVIEW_REQUEST" r

                    WHERE
                        r.assessment_id = a.id
                ) AS has_review_request

            FROM public."FEASIBILITY_ASSESSMENT_LOG" a

            {where_clause}

            ORDER BY
                a.created_at DESC

            LIMIT %(limit)s

            OFFSET %(offset)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    count_query,
                    params,
                )

                count_row = (
                    cursor.fetchone()
                )

                cursor.execute(
                    data_query,
                    params,
                )

                rows = (
                    cursor.fetchall()
                )

        total = (
            count_row["total"]
            if count_row
            else 0
        )

        return (
            rows,
            total,
        )

    def get_assessment_detail(
        self,
        assessment_id: UUID,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                a.id,
                a.created_at,
                a.session_id,

                a.project_type,

                a.floor_area,
                a.affected_area,

                a.levels,
                a.bathrooms,
                a.kitchens,

                a.budget,

                a.scope_json,
                a.request_json,

                a.assessment_status,

                a.estimate_low,
                a.estimate_typical,
                a.estimate_high,

                a.typical_per_sqm,

                a.verdict,

                a.confidence,
                a.confidence_score,

                a.comparable_count,
                a.average_similarity,

                a.response_json,

                r.id AS review_request_id

            FROM public."FEASIBILITY_ASSESSMENT_LOG" a

            LEFT JOIN public."FEASIBILITY_REVIEW_REQUEST" r
                ON r.assessment_id = a.id

            WHERE
                a.id = %(assessment_id)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "assessment_id": (
                            assessment_id
                        ),
                    },
                )

                row = cursor.fetchone()

        return row

    def get_review_requests(
        self,
        *,
        status: str | None,
        project_type: str | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> tuple[
        list[dict[str, Any]],
        int,
    ]:
        conditions: list[str] = []

        params: dict[str, Any] = {}

        if status:
            conditions.append(
                'r.status = %(status)s'
            )

            params[
                "status"
            ] = status

        if project_type:
            conditions.append(
                'r.project_type = %(project_type)s'
            )

            params[
                "project_type"
            ] = project_type

        if search:
            conditions.append(
                """
                (
                    r.first_name ILIKE %(search)s
                    OR
                    r.last_name ILIKE %(search)s
                    OR
                    r.email ILIKE %(search)s
                    OR
                    COALESCE(
                        r.phone,
                        ''
                    ) ILIKE %(search)s
                    OR
                    COALESCE(
                        r.location,
                        ''
                    ) ILIKE %(search)s
                )
                """
            )

            params[
                "search"
            ] = (
                f"%{search}%"
            )

        where_clause = ""

        if conditions:
            where_clause = (
                "WHERE "
                + " AND ".join(
                    conditions
                )
            )

        offset = (
            page - 1
        ) * page_size

        params.update(
            {
                "limit": (
                    page_size
                ),

                "offset": (
                    offset
                ),
            }
        )

        count_query = f"""
            SELECT
                COUNT(*) AS total

            FROM public."FEASIBILITY_REVIEW_REQUEST" r

            {where_clause};
        """

        data_query = f"""
            SELECT
                r.id,
                r.created_at,
                r.updated_at,

                r.assessment_id,
                r.session_id,

                r.first_name,
                r.last_name,

                r.email,
                r.phone,

                r.location,
                r.postcode,

                r.project_type,

                r.budget,

                r.status,

                COUNT(
                    f.id
                ) AS file_count

            FROM public."FEASIBILITY_REVIEW_REQUEST" r

            LEFT JOIN public."FEASIBILITY_REVIEW_FILE" f
                ON f.review_request_id = r.id

            {where_clause}

            GROUP BY
                r.id

            ORDER BY
                r.created_at DESC

            LIMIT %(limit)s

            OFFSET %(offset)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    count_query,
                    params,
                )

                count_row = (
                    cursor.fetchone()
                )

                cursor.execute(
                    data_query,
                    params,
                )

                rows = (
                    cursor.fetchall()
                )

        total = (
            count_row["total"]
            if count_row
            else 0
        )

        return (
            rows,
            total,
        )

    def get_review_detail(
        self,
        review_request_id: UUID,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                id,
                created_at,
                updated_at,

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

            FROM public."FEASIBILITY_REVIEW_REQUEST"

            WHERE
                id = %(review_request_id)s;
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

                row = cursor.fetchone()

        return row

    def get_review_files(
        self,
        review_request_id: UUID,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                id,
                uploaded_at,

                original_file_name,
                storage_path,

                mime_type,
                file_size

            FROM public."FEASIBILITY_REVIEW_FILE"

            WHERE
                review_request_id = %(review_request_id)s

            ORDER BY
                uploaded_at ASC;
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

                rows = cursor.fetchall()

        return rows

    def get_file(
        self,
        file_id: UUID,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                id,
                review_request_id,

                original_file_name,
                storage_path,

                mime_type,
                file_size

            FROM public."FEASIBILITY_REVIEW_FILE"

            WHERE
                id = %(file_id)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "file_id": (
                            file_id
                        ),
                    },
                )

                row = cursor.fetchone()

        return row

    def update_review_status(
        self,
        review_request_id: UUID,
        status: str,
    ) -> dict[str, Any] | None:
        query = """
            UPDATE public."FEASIBILITY_REVIEW_REQUEST"

            SET
                status = %(status)s,
                updated_at = NOW()

            WHERE
                id = %(review_request_id)s

            RETURNING
                id,
                status,
                updated_at;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "review_request_id": (
                            review_request_id
                        ),

                        "status": (
                            status
                        ),
                    },
                )

                row = cursor.fetchone()

            connection.commit()

        return row