from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException

from app.repositories.feasibility_repository import (
    FeasibilityRepository,
)

from app.schemas.feasibility import (
    FeasibilityAssessment,
    FeasibilityBudgetAssessment,
    FeasibilityEstimate,
    FeasibilityEvidence,
    FeasibilityRequest,
    FeasibilityResponse,
)

from app.services.feasibility.comparable_engine import (
    ComparableEngine,
)


class FeasibilityService:
    MIN_COMPARABLES = 5

    CATEGORY_MAP = {
        "new_build": [
            "new_build",
        ],

        "renovation": [
            "renovation",
        ],

        "extension": [
            "extension",
            "renovation_and_extension",
        ],

        "multi_unit": [
            "multi_unit",
        ],
    }

    def __init__(
        self,
        repository: FeasibilityRepository,
    ) -> None:
        self.repository = repository
        self.comparable_engine = ComparableEngine()

    def assess(
        self,
        request: FeasibilityRequest,
    ) -> FeasibilityResponse:
        assessment_id = uuid4()

        session_id = (
            request.session_id
            or uuid4()
        )

        # ---------------------------------------------------------
        # Validate project-specific inputs
        # ---------------------------------------------------------

        pricing_area = self._get_pricing_area(
            request
        )

        pricing_area_basis = (
            self._get_pricing_area_basis(
                request.project_type
            )
        )

        # ---------------------------------------------------------
        # Historical candidate pool
        # ---------------------------------------------------------

        categories = self.CATEGORY_MAP[
            request.project_type
        ]

        candidates = (
            self.repository.get_candidates(
                categories
            )
        )

        # ---------------------------------------------------------
        # Comparable scoring
        # ---------------------------------------------------------

        comparables = (
            self.comparable_engine.find_comparables(
                project_type=request.project_type,
                requested_area=pricing_area,

                levels=(
                    request.layout.levels
                ),

                bathrooms=(
                    request.layout.bathrooms
                ),

                kitchens=(
                    request.layout.kitchens
                ),

                scope=request.scope,

                candidates=candidates,
            )
        )

        # ---------------------------------------------------------
        # Insufficient historical evidence
        # ---------------------------------------------------------

        if len(comparables) < self.MIN_COMPARABLES:
            return self._insufficient_response(
                request=request,
                comparables=comparables,
                assessment_id=assessment_id,
                session_id=session_id,
            )

        # ---------------------------------------------------------
        # Weighted price distribution
        # ---------------------------------------------------------

        low_per_sqm = (
            self._weighted_percentile(
                comparables,
                Decimal("0.25"),
            )
        )

        typical_per_sqm = (
            self._weighted_percentile(
                comparables,
                Decimal("0.50"),
            )
        )

        high_per_sqm = (
            self._weighted_percentile(
                comparables,
                Decimal("0.75"),
            )
        )

        low_estimate = (
            pricing_area
            * low_per_sqm
        )

        typical_estimate = (
            pricing_area
            * typical_per_sqm
        )

        high_estimate = (
            pricing_area
            * high_per_sqm
        )

        # ---------------------------------------------------------
        # Confidence
        # ---------------------------------------------------------

        average_similarity = (
            sum(
                (
                    row["similarity_score"]
                    for row in comparables
                ),
                Decimal("0"),
            )
            / Decimal(
                len(comparables)
            )
        )

        price_values = [
            self._decimal(
                row["selling_per_relevant_sqm"]
            )
            for row in comparables
        ]

        confidence_score = (
            self._calculate_confidence_score(
                comparable_count=len(
                    comparables
                ),
                average_similarity=(
                    average_similarity
                ),
                low_per_sqm=low_per_sqm,
                high_per_sqm=high_per_sqm,
                typical_per_sqm=(
                    typical_per_sqm
                ),
                price_values=price_values,
            )
        )

        (
            confidence,
            confidence_label,
        ) = self._confidence_label(
            confidence_score
        )

        if (
            request.project_type == "extension"
            and confidence == "high"
        ):
            confidence = "medium"
            confidence_label = "Medium Confidence"

        # ---------------------------------------------------------
        # Budget
        # ---------------------------------------------------------

        budget_assessment = None

        if request.budget is not None:
            budget_assessment = (
                self._assess_budget(
                    budget=request.budget,
                    low_estimate=low_estimate,
                    typical_estimate=(
                        typical_estimate
                    ),
                )
            )

        # ---------------------------------------------------------
        # Human-readable assessment
        # ---------------------------------------------------------

        matched_scope_characteristics = (
            self._get_matched_scope_characteristics(
                request
            )
        )

        summary = self._build_summary(
            budget_assessment
        )

        # ---------------------------------------------------------
        # Response
        # ---------------------------------------------------------

        return self._log_and_return(
            request=request,
            response=FeasibilityResponse(
                assessment_id=assessment_id,
                session_id=session_id,

                status="completed",

            project_type=(
                request.project_type
            ),

            estimate=FeasibilityEstimate(
                low=self._money(
                    low_estimate
                ),

                typical=self._money(
                    typical_estimate
                ),

                high=self._money(
                    high_estimate
                ),

                low_per_sqm=self._money(
                    low_per_sqm
                ),

                typical_per_sqm=self._money(
                    typical_per_sqm
                ),

                high_per_sqm=self._money(
                    high_per_sqm
                ),

                pricing_area=self._area(
                    pricing_area
                ),

                pricing_area_basis=(
                    pricing_area_basis
                ),
            ),

            budget=budget_assessment,

            evidence=FeasibilityEvidence(
                comparable_count=len(
                    comparables
                ),

                confidence=confidence,

                confidence_label=(
                    confidence_label
                ),

                confidence_score=(
                    confidence_score
                ),

                average_similarity=(
                    average_similarity.quantize(
                        Decimal("0.01")
                    )
                ),
            ),

            assessment=FeasibilityAssessment(
                summary=summary,

                matched_scope_characteristics=(
                    matched_scope_characteristics
                ),
            ),

            assumptions=[
                (
                    "This indicative assessment is based "
                    "on historical YourQS project data."
                ),
                (
                    "Historical projects are matched using "
                    "project size, layout and available "
                    "scope characteristics."
                ),
                (
                    "Final construction cost may vary due "
                    "to detailed design, specification, "
                    "location, site conditions and scope."
                ),
            ],
            ),
        )

    # =============================================================
    # Project validation
    # =============================================================

    def _get_pricing_area(
        self,
        request: FeasibilityRequest,
    ) -> Decimal:
        if request.project_type in (
            "new_build",
            "multi_unit",
        ):
            if request.area.floor_area is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "floor_area is required "
                        "for this project type."
                    ),
                )

            return request.area.floor_area

        if request.project_type in (
            "renovation",
            "extension",
        ):
            if request.area.affected_area is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "affected_area is required "
                        "for this project type."
                    ),
                )

            return request.area.affected_area

        raise HTTPException(
            status_code=422,
            detail="Unsupported project type.",
        )

    @staticmethod
    def _get_pricing_area_basis(
        project_type: str,
    ) -> str:
        if project_type in (
            "new_build",
            "multi_unit",
        ):
            return "floor_area"

        return "affected_area"

    # =============================================================
    # Weighted percentile
    # =============================================================

    def _weighted_percentile(
        self,
        comparables: list[dict[str, Any]],
        percentile: Decimal,
    ) -> Decimal:
        values = sorted(
            (
                (
                    self._decimal(
                        row[
                            "selling_per_relevant_sqm"
                        ]
                    ),
                    self._decimal(
                        row[
                            "similarity_score"
                        ]
                    ),
                )
                for row in comparables
            ),
            key=lambda item: item[0],
        )

        total_weight = sum(
            (
                weight
                for _, weight in values
            ),
            Decimal("0"),
        )

        if total_weight <= 0:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Comparable projects do not "
                    "contain usable weights."
                ),
            )

        target_weight = (
            total_weight
            * percentile
        )

        cumulative_weight = Decimal("0")

        for value, weight in values:
            cumulative_weight += weight

            if (
                cumulative_weight
                >= target_weight
            ):
                return value

        return values[-1][0]

    # =============================================================
    # Confidence
    # =============================================================

    def _calculate_confidence_score(
        self,
        comparable_count: int,
        average_similarity: Decimal,
        low_per_sqm: Decimal,
        high_per_sqm: Decimal,
        typical_per_sqm: Decimal,
        price_values: list[Decimal],
    ) -> int:
        # ---------------------------------------------------------
        # Sample score: 0-30
        # ---------------------------------------------------------

        sample_score = min(
            Decimal("30"),
            (
                Decimal(
                    comparable_count
                )
                / Decimal("20")
            )
            * Decimal("30"),
        )

        # ---------------------------------------------------------
        # Similarity score: 0-45
        # ---------------------------------------------------------

        similarity_score = (
            average_similarity
            * Decimal("45")
        )

        # ---------------------------------------------------------
        # Spread score: 0-25
        # ---------------------------------------------------------

        if typical_per_sqm <= 0:
            spread_score = Decimal("0")

        else:
            relative_spread = (
                (
                    high_per_sqm
                    - low_per_sqm
                )
                / typical_per_sqm
            )

            if (
                relative_spread
                <= Decimal("0.30")
            ):
                spread_score = Decimal("25")

            elif (
                relative_spread
                <= Decimal("0.50")
            ):
                spread_score = Decimal("20")

            elif (
                relative_spread
                <= Decimal("0.75")
            ):
                spread_score = Decimal("14")

            elif (
                relative_spread
                <= Decimal("1.00")
            ):
                spread_score = Decimal("8")

            else:
                spread_score = Decimal("3")

        total = (
            sample_score
            + similarity_score
            + spread_score
        )

        return int(
            max(
                Decimal("0"),
                min(
                    Decimal("100"),
                    total,
                ),
            )
        )

    @staticmethod
    def _confidence_label(
        score: int,
    ) -> tuple[str, str]:
        if score >= 80:
            return (
                "high",
                "High Confidence",
            )

        if score >= 55:
            return (
                "medium",
                "Medium Confidence",
            )

        if score >= 30:
            return (
                "low",
                "Low Confidence",
            )

        return (
            "insufficient",
            "Insufficient Evidence",
        )

    # =============================================================
    # Budget
    # =============================================================

    def _assess_budget(
        self,
        budget: Decimal,
        low_estimate: Decimal,
        typical_estimate: Decimal,
    ) -> FeasibilityBudgetAssessment:
        difference = (
            budget
            - typical_estimate
        )

        if typical_estimate == 0:
            difference_percent = (
                Decimal("0")
            )

        else:
            difference_percent = (
                difference
                / typical_estimate
            ) * Decimal("100")

        if budget >= typical_estimate:
            verdict = "feasible"
            verdict_label = "Feasible"

        elif budget >= low_estimate:
            verdict = "borderline"
            verdict_label = "Borderline"

        else:
            verdict = "unlikely"
            verdict_label = "Unlikely"

        return FeasibilityBudgetAssessment(
            amount=self._money(
                budget
            ),

            difference_from_typical=(
                self._money(
                    difference
                )
            ),

            difference_percent=(
                difference_percent.quantize(
                    Decimal("0.01")
                )
            ),

            verdict=verdict,
            verdict_label=verdict_label,
        )

    # =============================================================
    # Public explanation
    # =============================================================

    def _build_summary(
        self,
        budget_assessment: (
            FeasibilityBudgetAssessment
            | None
        ),
    ) -> str:
        if budget_assessment is None:
            return (
                "The estimated range reflects "
                "historical projects with similar "
                "characteristics."
            )

        if (
            budget_assessment.verdict
            == "feasible"
        ):
            return (
                "Your proposed budget is at or above "
                "the typical historical estimate for "
                "projects with similar characteristics."
            )

        if (
            budget_assessment.verdict
            == "borderline"
        ):
            return (
                "Your proposed budget falls within the "
                "historical estimated range, but is below "
                "the typical estimate for similar projects."
            )

        return (
            "Your proposed budget is below the lower "
            "historical estimate for projects with "
            "similar characteristics."
        )

    def _get_matched_scope_characteristics(
        self,
        request: FeasibilityRequest,
    ) -> list[str]:
        characteristics: list[str] = []

        if request.project_type == "new_build":
            if request.scope.retaining is True:
                characteristics.append(
                    "Retaining works"
                )

            if request.scope.demolition is True:
                characteristics.append(
                    "Demolition works"
                )

            if request.scope.pool is True:
                characteristics.append(
                    "Swimming pool"
                )

            if request.scope.outbuilding is True:
                characteristics.append(
                    "Garage or outbuilding"
                )

        elif request.project_type == "renovation":
            if request.scope.demolition is True:
                characteristics.append(
                    "Demolition works"
                )

            if request.scope.recladding is True:
                characteristics.append(
                    "Recladding"
                )

            if request.scope.outbuilding is True:
                characteristics.append(
                    "Garage or outbuilding"
                )

        elif request.project_type == "extension":
            if request.scope.demolition is True:
                characteristics.append(
                    "Demolition works"
                )

            if request.scope.retaining is True:
                characteristics.append(
                    "Retaining works"
                )

            if request.scope.roofing is True:
                characteristics.append(
                    "Roofing works"
                )

            if request.scope.outbuilding is True:
                characteristics.append(
                    "Garage or outbuilding"
                )

        return characteristics

    # =============================================================
    # Insufficient evidence
    # =============================================================

    def _insufficient_response(
        self,
        request: FeasibilityRequest,
        comparables: list[dict[str, Any]],
        assessment_id: UUID,
        session_id: UUID,
    ) -> FeasibilityResponse:
        average_similarity = None

        if comparables:
            average_similarity = (
                sum(
                    (
                        row["similarity_score"]
                        for row in comparables
                    ),
                    Decimal("0"),
                )
                / Decimal(
                    len(comparables)
                )
            ).quantize(
                Decimal("0.01")
            )

        return self._log_and_return(
            request=request,
            response=FeasibilityResponse(
                assessment_id=assessment_id,
                session_id=session_id,

                status="insufficient_data",

            project_type=(
                request.project_type
            ),

            estimate=None,
            budget=None,

            evidence=FeasibilityEvidence(
                comparable_count=len(
                    comparables
                ),

                confidence="insufficient",

                confidence_label=(
                    "Insufficient Evidence"
                ),

                confidence_score=0,

                average_similarity=(
                    average_similarity
                ),
            ),

            assessment=FeasibilityAssessment(
                summary=(
                    "There are not enough sufficiently "
                    "similar historical projects to produce "
                    "a reliable automated feasibility estimate."
                ),

                matched_scope_characteristics=(
                    self._get_matched_scope_characteristics(
                        request
                    )
                ),
            ),

            assumptions=[
                (
                    "A detailed YourQS review is recommended "
                    "for this project."
                )
            ],
            ),
        )

    # =============================================================
    # Assessment logging
    # =============================================================

    def _log_and_return(
        self,
        request: FeasibilityRequest,
        response: FeasibilityResponse,
    ) -> FeasibilityResponse:
        self.repository.create_assessment_log(
            assessment_id=response.assessment_id,
            session_id=response.session_id,
            request=request,
            response=response,
        )

        return response

    # =============================================================
    # Formatting
    # =============================================================

    @staticmethod
    def _decimal(
        value,
    ) -> Decimal:
        if isinstance(
            value,
            Decimal,
        ):
            return value

        return Decimal(
            str(value)
        )

    @staticmethod
    def _money(
        value: Decimal,
    ) -> Decimal:
        return value.quantize(
            Decimal("0.01")
        )

    @staticmethod
    def _area(
        value: Decimal,
    ) -> Decimal:
        return value.quantize(
            Decimal("0.01")
        )