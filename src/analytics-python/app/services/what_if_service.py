from decimal import Decimal

from fastapi import HTTPException

from app.repositories.what_if_repository import (
    WhatIfRepository,
)
from app.schemas.what_if import (
    WhatIfAdjustmentResult,
    WhatIfImpact,
    WhatIfProjectState,
    WhatIfRequest,
    WhatIfResponse,
)


class WhatIfService:
    def __init__(
        self,
        repository: WhatIfRepository,
    ) -> None:
        self.repository = repository

    def run_scenario(
        self,
        project_id: str,
        request: WhatIfRequest,
    ) -> WhatIfResponse:
        project = self.repository.get_project(project_id)

        if project is None:
            raise HTTPException(
                status_code=404,
                detail="Project not found.",
            )

        if (
            not project["has_cost_data"]
            or not project["has_valid_floor_area"]
            or not project["is_analytics_ready"]
            or project["total_cost"] is None
            or project["total_selling_price"] is None
            or project["floor_area"] is None
            or project["floor_area"] <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Project does not have sufficient "
                    "data for what-if analysis."
                ),
            )

        scope_rows = self.repository.get_scopes(project_id)

        scopes_by_id = {
            row["trade_id"]: row
            for row in scope_rows
            if row["trade_id"] is not None
        }

        requested_trade_ids = [
            adjustment.trade_id
            for adjustment in request.adjustments
        ]

        if len(requested_trade_ids) != len(set(requested_trade_ids)):
            raise HTTPException(
                status_code=422,
                detail="The same scope cannot be adjusted more than once.",
            )

        missing_trade_ids = [
            trade_id
            for trade_id in requested_trade_ids
            if trade_id not in scopes_by_id
        ]

        if missing_trade_ids:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "One or more selected scopes do not "
                        "belong to this project."
                    ),
                    "invalidTradeIds": missing_trade_ids,
                },
            )

        adjustment_results = []
        total_cost_difference = Decimal("0")

        for adjustment in request.adjustments:
            scope = scopes_by_id[adjustment.trade_id]

            original_cost = scope["original_cost"]

            multiplier = (
                Decimal("1")
                + adjustment.change_percent
                / Decimal("100")
            )

            adjusted_cost = original_cost * multiplier

            cost_difference = (
                adjusted_cost - original_cost
            )

            total_cost_difference += cost_difference

            adjustment_results.append(
                WhatIfAdjustmentResult(
                    trade_id=adjustment.trade_id,
                    scope_name=scope["scope_name"],
                    original_cost=original_cost,
                    change_percent=adjustment.change_percent,
                    adjusted_cost=adjusted_cost,
                    cost_difference=cost_difference,
                )
            )

        original_total_cost = project["total_cost"]
        selling_price = project["total_selling_price"]
        floor_area = project["floor_area"]

        adjusted_total_cost = (
            original_total_cost
            + total_cost_difference
        )

        original_cost_per_sqm = (
            original_total_cost
            / floor_area
        )

        adjusted_cost_per_sqm = (
            adjusted_total_cost
            / floor_area
        )

        original_gross_margin = (
            selling_price
            - original_total_cost
        )

        adjusted_gross_margin = (
            selling_price
            - adjusted_total_cost
        )

        original_margin_percent = (
            original_gross_margin
            / selling_price
        ) * Decimal("100")

        adjusted_margin_percent = (
            adjusted_gross_margin
            / selling_price
        ) * Decimal("100")

        if original_total_cost == 0:
            cost_difference_percent = Decimal("0")
        else:
            cost_difference_percent = (
                total_cost_difference
                / original_total_cost
            ) * Decimal("100")

        margin_difference_percentage_points = (
            adjusted_margin_percent
            - original_margin_percent
        )

        return WhatIfResponse(
            project_id=project["project_id"],
            project_name=project["project_name"],

            original=WhatIfProjectState(
                total_cost=original_total_cost,
                cost_per_sqm=original_cost_per_sqm,
                gross_margin=original_gross_margin,
                margin_percent=original_margin_percent,
            ),

            adjusted=WhatIfProjectState(
                total_cost=adjusted_total_cost,
                cost_per_sqm=adjusted_cost_per_sqm,
                gross_margin=adjusted_gross_margin,
                margin_percent=adjusted_margin_percent,
            ),

            impact=WhatIfImpact(
                cost_difference=total_cost_difference,
                cost_difference_percent=(
                    cost_difference_percent
                ),
                margin_difference_percentage_points=(
                    margin_difference_percentage_points
                ),
            ),

            adjustments=adjustment_results,
        )