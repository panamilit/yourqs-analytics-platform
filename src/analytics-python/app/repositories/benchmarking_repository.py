from decimal import Decimal
from typing import Any

from app.db.pool import database_pool


class BenchmarkingRepository:
    def get_project(
        self,
        project_id: str,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                project_id,
                project_name,
                floor_area,
                number_of_levels,
                total_bathroom_count,
                total_cost,
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

    def get_benchmark_values(
        self,
    ) -> list[Decimal]:
        query = """
            SELECT
                (
                    total_cost / NULLIF(floor_area, 0)
                )::numeric AS cost_per_sqm
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE has_cost_data = TRUE
              AND has_valid_floor_area = TRUE
              AND is_analytics_ready = TRUE
              AND total_cost IS NOT NULL
              AND floor_area IS NOT NULL
              AND floor_area > 0
              AND total_cost >= 0;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)
                rows = cursor.fetchall()

        return [
            row["cost_per_sqm"]
            for row in rows
            if row["cost_per_sqm"] is not None
        ]

    def get_similar_project_candidates(
        self,
        project_id: str,
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                project_id,
                project_name,
                floor_area,
                number_of_levels,
                total_bathroom_count,
                total_cost,
                (
                    total_cost / NULLIF(floor_area, 0)
                )::numeric AS cost_per_sqm
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE project_id <> %(project_id)s
            AND has_cost_data = TRUE
            AND has_valid_floor_area = TRUE
            AND is_analytics_ready = TRUE
            AND total_cost IS NOT NULL
            AND floor_area IS NOT NULL
            AND floor_area > 0
            AND total_cost >= 0;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {"project_id": project_id},
                )
                rows = cursor.fetchall()

        return rows   