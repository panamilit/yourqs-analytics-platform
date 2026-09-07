from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from app.db.pool import database_pool

from app.schemas.feasibility import (
    FeasibilityRequest,
    FeasibilityResponse,
)


class FeasibilityRepository:
    # ==========================================================
    # Historical comparable candidates
    # ==========================================================

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

    # ==========================================================
    # Assessment logging
    # ==========================================================

    def create_assessment_log(
        self,
        assessment_id: UUID,
        session_id: UUID,
        request: FeasibilityRequest,
        response: FeasibilityResponse,
    ) -> None:
        estimate = response.estimate
        budget = response.budget
        evidence = response.evidence

        query = """
            INSERT INTO public."FEASIBILITY_ASSESSMENT_LOG" (
                id,
                session_id,

                project_type,

                floor_area,
                affected_area,

                levels,
                bathrooms,
                kitchens,

                budget,

                scope_json,
                request_json,

                assessment_status,

                estimate_low,
                estimate_typical,
                estimate_high,

                typical_per_sqm,

                verdict,

                confidence,
                confidence_score,
                comparable_count,
                average_similarity,

                response_json
            )
            VALUES (
                %(id)s,
                %(session_id)s,

                %(project_type)s,

                %(floor_area)s,
                %(affected_area)s,

                %(levels)s,
                %(bathrooms)s,
                %(kitchens)s,

                %(budget)s,

                %(scope_json)s,
                %(request_json)s,

                %(assessment_status)s,

                %(estimate_low)s,
                %(estimate_typical)s,
                %(estimate_high)s,

                %(typical_per_sqm)s,

                %(verdict)s,

                %(confidence)s,
                %(confidence_score)s,
                %(comparable_count)s,
                %(average_similarity)s,

                %(response_json)s
            );
        """

        request_snapshot = request.model_dump(
            mode="json"
        )

        response_snapshot = response.model_dump(
            mode="json"
        )

        scope_snapshot = request.scope.model_dump(
            mode="json"
        )

        params = {
            "id": assessment_id,
            "session_id": session_id,

            "project_type": (
                request.project_type
            ),

            "floor_area": (
                request.area.floor_area
            ),

            "affected_area": (
                request.area.affected_area
            ),

            "levels": (
                request.layout.levels
            ),

            "bathrooms": (
                request.layout.bathrooms
            ),

            "kitchens": (
                request.layout.kitchens
            ),

            "budget": request.budget,

            "scope_json": Jsonb(
                scope_snapshot
            ),

            "request_json": Jsonb(
                request_snapshot
            ),

            "assessment_status": (
                response.status
            ),

            "estimate_low": (
                estimate.low
                if estimate
                else None
            ),

            "estimate_typical": (
                estimate.typical
                if estimate
                else None
            ),

            "estimate_high": (
                estimate.high
                if estimate
                else None
            ),

            "typical_per_sqm": (
                estimate.typical_per_sqm
                if estimate
                else None
            ),

            "verdict": (
                budget.verdict
                if budget
                else None
            ),

            "confidence": (
                evidence.confidence
            ),

            "confidence_score": (
                evidence.confidence_score
            ),

            "comparable_count": (
                evidence.comparable_count
            ),

            "average_similarity": (
                evidence.average_similarity
            ),

            "response_json": Jsonb(
                response_snapshot
            ),
        }

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    query,
                    params,
                )

            connection.commit()

    # ==========================================================
    # Assessment lookup for review requests
    # ==========================================================

    def get_assessment_log(
        self,
        assessment_id: UUID,
    ) -> dict[str, Any] | None:
        query = """
            SELECT
                id,
                session_id,
                project_type,

                floor_area,
                affected_area,

                levels,
                bathrooms,
                kitchens,

                budget,
                scope_json,

                assessment_status,

                estimate_low,
                estimate_typical,
                estimate_high,
                typical_per_sqm,

                verdict,
                confidence,
                confidence_score,
                comparable_count,
                average_similarity,

                created_at

            FROM public."FEASIBILITY_ASSESSMENT_LOG"

            WHERE id = %(assessment_id)s;
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