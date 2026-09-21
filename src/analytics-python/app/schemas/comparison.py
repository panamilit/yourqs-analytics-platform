from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ComparisonScope(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    scope_name: str = Field(
        serialization_alias="scopeName",
    )

    total_cost: Decimal = Field(
        serialization_alias="totalCost",
    )

    percentage: Decimal = Field(
        serialization_alias="percentage",
    )


class ComparisonProject(BaseModel):
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

    floor_area: Decimal | None = Field(
        default=None,
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

    total_cost: Decimal | None = Field(
        default=None,
        serialization_alias="totalCost",
    )

    total_selling_price: Decimal | None = Field(
        default=None,
        serialization_alias="totalSellingPrice",
    )

    gross_margin: Decimal | None = Field(
        default=None,
        serialization_alias="grossMargin",
    )

    margin_percent: Decimal | None = Field(
        default=None,
        serialization_alias="marginPercent",
    )

    cost_per_sqm: Decimal | None = Field(
        default=None,
        serialization_alias="costPerSqm",
    )

    selling_price_per_sqm: Decimal | None = Field(
        default=None,
        serialization_alias="sellingPricePerSqm",
    )

    top_scopes: list[ComparisonScope] = Field(
        serialization_alias="topScopes",
    )


class ProjectsComparisonResponse(BaseModel):
    projects: list[ComparisonProject]