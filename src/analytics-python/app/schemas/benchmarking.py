from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SimilarProject(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    project_id: str = Field(
        serialization_alias="projectId",
    )
    project_name: str = Field(
        serialization_alias="projectName",
    )

    floor_area: Decimal = Field(
        serialization_alias="floorArea",
    )
    number_of_levels: int | None = Field(
        default=None,
        serialization_alias="numberOfLevels",
    )
    total_bathroom_count: int | None = Field(
        default=None,
        serialization_alias="totalBathroomCount",
    )

    total_cost: Decimal = Field(
        serialization_alias="totalCost",
    )
    cost_per_sqm: Decimal = Field(
        serialization_alias="costPerSqm",
    )


class ProjectBenchmarkResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    project_id: str = Field(
        serialization_alias="projectId",
    )
    project_name: str = Field(
        serialization_alias="projectName",
    )

    project_cost_per_sqm: Decimal = Field(
        serialization_alias="projectCostPerSqm",
    )

    dataset_average: Decimal = Field(
        serialization_alias="datasetAverage",
    )
    dataset_median: Decimal = Field(
        serialization_alias="datasetMedian",
    )

    variance_from_average_percent: Decimal = Field(
        serialization_alias="varianceFromAveragePercent",
    )
    variance_from_median_percent: Decimal = Field(
        serialization_alias="varianceFromMedianPercent",
    )

    percentile: Decimal

    dataset_min: Decimal = Field(
        serialization_alias="datasetMin",
    )
    dataset_max: Decimal = Field(
        serialization_alias="datasetMax",
    )

    benchmark_project_count: int = Field(
        serialization_alias="benchmarkProjectCount",
    )
    excluded_outlier_count: int = Field(
        serialization_alias="excludedOutlierCount",
    )

    lower_bound: Decimal = Field(
        serialization_alias="lowerBound",
    )
    upper_bound: Decimal = Field(
        serialization_alias="upperBound",
    )

    similar_projects: list[SimilarProject] = Field(
        serialization_alias="similarProjects",
    )

    position: str

    position_label: str = Field(
        serialization_alias="positionLabel",
    )