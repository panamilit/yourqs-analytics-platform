from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.projects import ProjectItem


class CostBreakdownItem(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    trade_id: str | None = Field(
        default=None,
        serialization_alias="tradeId",
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


class ProjectDetailsResponse(BaseModel):
    project: ProjectItem

    cost_breakdown: list[CostBreakdownItem] = Field(
        serialization_alias="costBreakdown",
    )

    top_cost_drivers: list[CostBreakdownItem] = Field(
        serialization_alias="topCostDrivers",
    )