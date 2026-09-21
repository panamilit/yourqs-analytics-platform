from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class WhatIfAdjustmentRequest(BaseModel):
    trade_id: str = Field(
        validation_alias="tradeId",
        serialization_alias="tradeId",
    )

    change_percent: Decimal = Field(
        validation_alias="changePercent",
        serialization_alias="changePercent",
        ge=-100,
        le=500,
    )


class WhatIfRequest(BaseModel):
    adjustments: list[WhatIfAdjustmentRequest] = Field(
        min_length=1,
        max_length=20,
    )


class WhatIfProjectState(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    total_cost: Decimal = Field(
        serialization_alias="totalCost",
    )

    cost_per_sqm: Decimal = Field(
        serialization_alias="costPerSqm",
    )

    gross_margin: Decimal = Field(
        serialization_alias="grossMargin",
    )

    margin_percent: Decimal = Field(
        serialization_alias="marginPercent",
    )


class WhatIfImpact(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    cost_difference: Decimal = Field(
        serialization_alias="costDifference",
    )

    cost_difference_percent: Decimal = Field(
        serialization_alias="costDifferencePercent",
    )

    margin_difference_percentage_points: Decimal = Field(
        serialization_alias="marginDifferencePercentagePoints",
    )


class WhatIfAdjustmentResult(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={Decimal: float},
    )

    trade_id: str = Field(
        serialization_alias="tradeId",
    )

    scope_name: str = Field(
        serialization_alias="scopeName",
    )

    original_cost: Decimal = Field(
        serialization_alias="originalCost",
    )

    change_percent: Decimal = Field(
        serialization_alias="changePercent",
    )

    adjusted_cost: Decimal = Field(
        serialization_alias="adjustedCost",
    )

    cost_difference: Decimal = Field(
        serialization_alias="costDifference",
    )


class WhatIfResponse(BaseModel):
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

    original: WhatIfProjectState

    adjusted: WhatIfProjectState

    impact: WhatIfImpact

    adjustments: list[WhatIfAdjustmentResult]