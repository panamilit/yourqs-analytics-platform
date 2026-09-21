from typing import Any

from app.db.pool import database_pool


class WhatIfRepository:
    def get_project(
        self,
        project_id: str,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                project_id,
                project_name,
                floor_area,
                total_cost,
                total_selling_price,
                gross_margin,
                margin_percent,
                has_cost_data,
                has_valid_floor_area,
                is_analytics_ready
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE project_id = %(project_id)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_id": project_id},
                )
                return cursor.fetchone()

    def get_scopes(
        self,
        project_id: str,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                gt."REC_ID" AS trade_id,
                COALESCE(
                    gt."NAME",
                    'Unassigned'
                ) AS scope_name,
                SUM(
                    COALESCE(jci."COST_PRICE", 0)
                )::numeric AS original_cost

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

            HAVING
                SUM(
                    COALESCE(jci."COST_PRICE", 0)
                ) > 0

            ORDER BY original_cost DESC;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_id": project_id},
                )
                return cursor.fetchall()