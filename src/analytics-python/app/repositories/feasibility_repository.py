from typing import Any

from app.db.pool import database_pool


class FeasibilityRepository:
    def get_candidates(
        self,
        categories: list[str],
    ) -> list[dict[str, Any]]:
        query = """
            SELECT
                project_id,
                project_name,

                source_project_type,
                feasibility_category,

                floor_area,
                affected_area,
                relevant_area,
                pricing_area_basis,

                levels,
                bathrooms,
                kitchens,

                total_cost,
                total_selling_price,

                cost_per_relevant_sqm,
                selling_per_relevant_sqm,

                margin_percent,

                mentions_retaining,
                mentions_demolition,
                mentions_recladding,
                mentions_roofing,
                mentions_pool,
                mentions_outbuilding,
                mentions_secondary_dwelling,
                mentions_structural_complexity,
                mentions_electrical_upgrade,
                mentions_plumbing_upgrade,

                has_scope_exclusions,

                is_clean_feasibility_candidate

            FROM public."VW_FEASIBILITY_PROJECT_FEATURES"

            WHERE is_clean_feasibility_candidate = TRUE
              AND feasibility_category = ANY(
                    %(categories)s
              )
              AND relevant_area IS NOT NULL
              AND relevant_area > 0
              AND selling_per_relevant_sqm IS NOT NULL
              AND selling_per_relevant_sqm > 0;
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    {
                        "categories": categories,
                    },
                )

                rows = cursor.fetchall()

        return rows