from decimal import Decimal
from statistics import mean, median, quantiles

from fastapi import HTTPException

from app.repositories.benchmarking_repository import (
    BenchmarkingRepository,
)
from app.schemas.benchmarking import (
    ProjectBenchmarkResponse,
    SimilarProject,
)


class BenchmarkingService:
    SIMILAR_PROJECT_LIMIT = 5

    def __init__(
        self,
        repository: BenchmarkingRepository,
    ) -> None:
        self.repository = repository

    def get_project_benchmark(
        self,
        project_id: str,
    ) -> ProjectBenchmarkResponse:
        project = self.repository.get_project(project_id)

        if project is None:
            raise HTTPException(
                status_code=404,
                detail="Project not found.",
            )

        if (
            not project["has_cost_data"]
            or not project["has_valid_floor_area"]
            or project["total_cost"] is None
            or project["floor_area"] is None
            or project["floor_area"] <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Project does not have sufficient "
                    "cost and floor area data for benchmarking."
                ),
            )

        # ---------------------------------------------------------
        # Raw benchmark dataset
        # ---------------------------------------------------------

        raw_values = self.repository.get_benchmark_values()

        if len(raw_values) < 4:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Not enough benchmark projects are available "
                    "for outlier filtering."
                ),
            )

        project_cost_per_sqm = (
            project["total_cost"]
            / project["floor_area"]
        )

        # ---------------------------------------------------------
        # IQR outlier filtering
        # ---------------------------------------------------------

        sorted_values = sorted(raw_values)

        quartiles = quantiles(
            sorted_values,
            n=4,
            method="inclusive",
        )

        q1 = Decimal(str(quartiles[0]))
        q3 = Decimal(str(quartiles[2]))

        iqr = q3 - q1

        statistical_lower_bound = (
            q1 - Decimal("1.5") * iqr
        )

        # Cost per m² cannot logically be negative.
        lower_bound = max(
            Decimal("0"),
            statistical_lower_bound,
        )

        upper_bound = (
            q3 + Decimal("1.5") * iqr
        )

        filtered_values = [
            value
            for value in raw_values
            if lower_bound <= value <= upper_bound
        ]

        excluded_outlier_count = (
            len(raw_values) - len(filtered_values)
        )

        if not filtered_values:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No benchmark projects remain after "
                    "outlier filtering."
                ),
            )

        # ---------------------------------------------------------
        # Dataset statistics
        # ---------------------------------------------------------

        dataset_average = Decimal(
            str(mean(filtered_values))
        )

        dataset_median = Decimal(
            str(median(filtered_values))
        )

        dataset_min = min(filtered_values)
        dataset_max = max(filtered_values)

        # ---------------------------------------------------------
        # Variance from average
        # ---------------------------------------------------------

        if dataset_average == 0:
            variance_from_average_percent = Decimal("0")
        else:
            variance_from_average_percent = (
                (
                    project_cost_per_sqm
                    - dataset_average
                )
                / dataset_average
            ) * Decimal("100")

        # ---------------------------------------------------------
        # Variance from median
        # ---------------------------------------------------------

        if dataset_median == 0:
            variance_from_median_percent = Decimal("0")
        else:
            variance_from_median_percent = (
                (
                    project_cost_per_sqm
                    - dataset_median
                )
                / dataset_median
            ) * Decimal("100")

        # ---------------------------------------------------------
        # Percentile in cleaned benchmark dataset
        # ---------------------------------------------------------

        below_or_equal = sum(
            1
            for value in filtered_values
            if value <= project_cost_per_sqm
        )

        percentile = (
            Decimal(below_or_equal)
            / Decimal(len(filtered_values))
        ) * Decimal("100")

        position, position_label = self._get_position(
            percentile
        )

        # ---------------------------------------------------------
        # Similar projects
        # ---------------------------------------------------------

        candidate_rows = (
            self.repository.get_similar_project_candidates(
                project_id
            )
        )

        # Keep benchmark outliers out of the similar-project list.
        candidate_rows = [
            row
            for row in candidate_rows
            if (
                row["cost_per_sqm"] is not None
                and lower_bound
                <= row["cost_per_sqm"]
                <= upper_bound
            )
        ]

        similar_rows = self._find_similar_projects(
            project,
            candidate_rows,
        )

        similar_projects = [
            SimilarProject(**row)
            for row in similar_rows
        ]

        # ---------------------------------------------------------
        # Response
        # ---------------------------------------------------------

        return ProjectBenchmarkResponse(
            project_id=project["project_id"],
            project_name=project["project_name"],
            project_cost_per_sqm=project_cost_per_sqm,

            dataset_average=dataset_average,
            dataset_median=dataset_median,

            variance_from_average_percent=(
                variance_from_average_percent
            ),
            variance_from_median_percent=(
                variance_from_median_percent
            ),

            percentile=percentile,

            dataset_min=dataset_min,
            dataset_max=dataset_max,

            benchmark_project_count=len(filtered_values),
            excluded_outlier_count=excluded_outlier_count,

            lower_bound=lower_bound,
            upper_bound=upper_bound,

            position=position,
            position_label=position_label,

            similar_projects=similar_projects,
        )


    def _find_similar_projects(
        self,
        project: dict,
        candidates: list[dict],
    ) -> list[dict]:
        target_area = project["floor_area"]
        target_levels = project.get("number_of_levels")
        target_bathrooms = project.get(
            "total_bathroom_count"
        )

        def similarity_key(candidate: dict) -> tuple:
            candidate_levels = candidate.get(
                "number_of_levels"
            )

            candidate_bathrooms = candidate.get(
                "total_bathroom_count"
            )

            # Same number of levels should be preferred.
            if (
                target_levels is not None
                and candidate_levels is not None
            ):
                level_difference = abs(
                    candidate_levels - target_levels
                )
            else:
                level_difference = 999

            # Then choose nearest floor area.
            area_difference = abs(
                candidate["floor_area"] - target_area
            )

            # Bathrooms are a secondary tie-breaker.
            if (
                target_bathrooms is not None
                and candidate_bathrooms is not None
            ):
                bathroom_difference = abs(
                    candidate_bathrooms
                    - target_bathrooms
                )
            else:
                bathroom_difference = 999

            return (
                level_difference,
                area_difference,
                bathroom_difference,
            )

        ordered = sorted(
            candidates,
            key=similarity_key,
        )

        return ordered[
            : self.SIMILAR_PROJECT_LIMIT
        ]


    def _get_position(
        self,
        percentile: Decimal,
    ) -> tuple[str, str]:
        if percentile < Decimal("20"):
            return (
                "very_low",
                "Very Low",
            )

        if percentile < Decimal("40"):
            return (
                "below_typical",
                "Below Typical",
            )

        if percentile < Decimal("60"):
            return (
                "typical",
                "Typical",
            )

        if percentile < Decimal("80"):
            return (
                "above_typical",
                "Above Typical",
            )

        if percentile < Decimal("95"):
            return (
                "high",
                "High",
            )

        return (
            "extreme",
            "Extreme",
        )