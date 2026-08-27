from typing import Any

from app.db.pool import database_pool


class ComparisonRepository:
    def get_projects(
        self,
        project_ids: list[str],
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                project_id,
                project_name,
                floor_area,
                number_of_levels,
                total_bathroom_count,
                total_cost,
                total_selling_price,
                gross_margin,
                margin_percent,
                selling_price_per_sqm,
                CASE
                    WHEN total_cost IS NOT NULL
                     AND floor_area IS NOT NULL
                     AND floor_area > 0
                    THEN total_cost / floor_area
                    ELSE NULL
                END AS cost_per_sqm
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE project_id = ANY(%(project_ids)s);
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_ids": project_ids},
                )
                return cursor.fetchall()

    def get_top_scopes(
        self,
        project_id: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        query = """
            WITH scope_costs AS (
                SELECT
                    COALESCE(
                        gt."NAME",
                        'Unassigned'
                    ) AS scope_name,

                    SUM(
                        COALESCE(jci."COST_PRICE", 0)
                    ) AS total_cost

                FROM public."JOB_COST_ELEMENT" jce

                JOIN public."JOB_COST_ITEM" jci
                    ON jci."JOB_COST_ELEMENT_REC_ID"
                     = jce."REC_ID"

                LEFT JOIN public."GLOB_TRADE" gt
                    ON gt."REC_ID"
                     = jci."GLOB_TRADE_REC_ID"

                WHERE
                    jce."PROJ_MASTER_REC_ID" = %(project_id)s

                    AND COALESCE(
                        NULLIF(TRIM(jce."IS_DELETED"), ''),
                        'N'
                    ) = 'N'

                    AND COALESCE(
                        NULLIF(TRIM(jce."IS_INACTIVE"), ''),
                        'N'
                    ) = 'N'

                    AND COALESCE(
                        NULLIF(TRIM(jci."IS_INACTIVE"), ''),
                        'N'
                    ) = 'N'

                GROUP BY
                    gt."REC_ID",
                    gt."NAME"
            )

            SELECT
                scope_name,

                ROUND(
                    total_cost::numeric,
                    2
                ) AS total_cost,

                ROUND(
                    total_cost * 100.0
                    /
                    NULLIF(
                        SUM(total_cost) OVER (),
                        0
                    ),
                    2
                ) AS percentage

            FROM scope_costs

            WHERE total_cost > 0

            ORDER BY total_cost DESC

            LIMIT %(limit)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "project_id": project_id,
                        "limit": limit,
                    },
                )

                return cursor.fetchall()