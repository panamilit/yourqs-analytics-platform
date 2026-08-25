from typing import Any

from app.db.pool import database_pool


class ProjectDetailsRepository:
    def get_project_summary(
        self,
        project_id: str,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                project_id,
                project_name,
                floor_area,
                total_bathroom_count,
                number_of_levels,
                model_count,
                total_cost,
                total_selling_price,
                cost_item_count,
                has_model_attributes,
                has_cost_data,
                has_valid_floor_area,
                is_analytics_ready,
                gross_margin,
                margin_percent,
                selling_price_per_sqm
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE project_id = %(project_id)s;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_id": project_id},
                )
                row = cursor.fetchone()

        return row

    def get_cost_breakdown(
        self,
        project_id: str,
    ) -> list[dict[str, Any]]:
        query = """
            WITH scope_costs AS (
                SELECT
                    gt."REC_ID" AS trade_id,
                    COALESCE(
                        gt."NAME",
                        'Unassigned'
                    ) AS scope_name,
                    SUM(
                        COALESCE(jci."COST_PRICE", 0)
                    ) AS total_cost
                FROM public."JOB_COST_ELEMENT" jce
                JOIN public."JOB_COST_ITEM" jci
                    ON jci."JOB_COST_ELEMENT_REC_ID" = jce."REC_ID"
                LEFT JOIN public."GLOB_TRADE" gt
                    ON gt."REC_ID" = jci."GLOB_TRADE_REC_ID"
                WHERE jce."PROJ_MASTER_REC_ID" = %(project_id)s

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
                trade_id,
                scope_name,
                ROUND(total_cost::numeric, 2) AS total_cost,
                ROUND(
                    (
                        total_cost * 100.0
                    )
                    /
                    NULLIF(
                        SUM(total_cost) OVER (),
                        0
                    ),
                    2
                ) AS percentage
            FROM scope_costs
            WHERE total_cost > 0
            ORDER BY total_cost DESC;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_id": project_id},
                )
                rows = cursor.fetchall()

        return rows