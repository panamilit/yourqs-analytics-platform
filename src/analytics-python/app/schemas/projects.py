from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProjectItem(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    project_id: str = Field(serialization_alias="projectId")
    project_name: str = Field(serialization_alias="projectName")

    floor_area: Decimal | None = Field(
        default=None,
        serialization_alias="floorArea",
    )
    total_bathroom_count: int | None = Field(
        default=None,
        serialization_alias="totalBathroomCount",
    )
    number_of_levels: int | None = Field(
        default=None,
        serialization_alias="numberOfLevels",
    )
    model_count: int | None = Field(
        default=None,
        serialization_alias="modelCount",
    )

    total_cost: Decimal | None = Field(
        default=None,
        serialization_alias="totalCost",
    )
    total_selling_price: Decimal | None = Field(
        default=None,
        serialization_alias="totalSellingPrice",
    )
    cost_item_count: int | None = Field(
        default=None,
        serialization_alias="costItemCount",
    )

    has_model_attributes: bool = Field(
        serialization_alias="hasModelAttributes",
    )
    has_cost_data: bool = Field(
        serialization_alias="hasCostData",
    )
    has_valid_floor_area: bool = Field(
        serialization_alias="hasValidFloorArea",
    )
    is_analytics_ready: bool = Field(
        serialization_alias="isAnalyticsReady",
    )

    gross_margin: Decimal | None = Field(
        default=None,
        serialization_alias="grossMargin",
    )
    margin_percent: Decimal | None = Field(
        default=None,
        serialization_alias="marginPercent",
    )
    selling_price_per_sqm: Decimal | None = Field(
        default=None,
        serialization_alias="sellingPricePerSqm",
    )


class ProjectsSummaryResponse(BaseModel):
    total_projects: int = Field(serialization_alias="totalProjects")
    projects_with_cost_data: int = Field(
        serialization_alias="projectsWithCostData",
    )
    analytics_ready_projects: int = Field(
        serialization_alias="analyticsReadyProjects",
    )


class ProjectsPageResponse(BaseModel):
    items: list[ProjectItem]
    page: int
    page_size: int = Field(serialization_alias="pageSize")
    total_items: int = Field(serialization_alias="totalItems")
    total_pages: int = Field(serialization_alias="totalPages")