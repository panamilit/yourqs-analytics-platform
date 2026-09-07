from decimal import Decimal
from typing import Any


class ComparableEngine:
    MAX_COMPARABLES = 25

    MIN_SIMILARITY = Decimal("0.50")

    MISSING_FEATURE_SIMILARITY = Decimal("0.35")

    CORE_WEIGHTS = {
        "new_build": {
            "area": Decimal("0.55"),
            "levels": Decimal("0.20"),
            "bathrooms": Decimal("0.15"),
            "kitchens": Decimal("0.10"),
        },

        "renovation": {
            "area": Decimal("0.50"),
            "levels": Decimal("0.15"),
            "bathrooms": Decimal("0.175"),
            "kitchens": Decimal("0.175"),
        },

        "extension": {
            "area": Decimal("0.50"),
            "levels": Decimal("0.15"),
            "bathrooms": Decimal("0.175"),
            "kitchens": Decimal("0.175"),
        },

        "multi_unit": {
            "area": Decimal("0.60"),
            "levels": Decimal("0.20"),
            "bathrooms": Decimal("0.10"),
            "kitchens": Decimal("0.10"),
        },
    }

    POSITIVE_SCOPE_BONUSES = {
        "new_build": {
            "retaining": (
                "mentions_retaining",
                Decimal("0.04"),
            ),
            "demolition": (
                "mentions_demolition",
                Decimal("0.03"),
            ),
            "pool": (
                "mentions_pool",
                Decimal("0.03"),
            ),
            "outbuilding": (
                "mentions_outbuilding",
                Decimal("0.03"),
            ),
        },

        "renovation": {
            "demolition": (
                "mentions_demolition",
                Decimal("0.05"),
            ),
            "recladding": (
                "mentions_recladding",
                Decimal("0.03"),
            ),
            "outbuilding": (
                "mentions_outbuilding",
                Decimal("0.02"),
            ),
        },

        "extension": {
            "demolition": (
                "mentions_demolition",
                Decimal("0.05"),
            ),
            "retaining": (
                "mentions_retaining",
                Decimal("0.03"),
            ),
            "outbuilding": (
                "mentions_outbuilding",
                Decimal("0.03"),
            ),
            "roofing": (
                "mentions_roofing",
                Decimal("0.02"),
            ),
        },

        "multi_unit": {},
    }

    def find_comparables(
        self,
        project_type: str,
        requested_area: Decimal,
        levels: int | None,
        bathrooms: int | None,
        kitchens: int | None,
        scope: Any,
        candidates: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        scored: list[dict[str, Any]] = []

        for candidate in candidates:
            similarity = self._calculate_similarity(
                project_type=project_type,
                requested_area=requested_area,
                levels=levels,
                bathrooms=bathrooms,
                kitchens=kitchens,
                scope=scope,
                candidate=candidate,
            )

            if similarity < self.MIN_SIMILARITY:
                continue

            result = dict(candidate)

            result["similarity_score"] = similarity

            scored.append(result)

        scored.sort(
            key=lambda row: row["similarity_score"],
            reverse=True,
        )

        return scored[
            : self.MAX_COMPARABLES
        ]

    def _calculate_similarity(
        self,
        project_type: str,
        requested_area: Decimal,
        levels: int | None,
        bathrooms: int | None,
        kitchens: int | None,
        scope: Any,
        candidate: dict[str, Any],
    ) -> Decimal:
        weights = self.CORE_WEIGHTS[
            project_type
        ]

        weighted_score = Decimal("0")
        total_weight = Decimal("0")

        # ---------------------------------------------------------
        # Area
        # ---------------------------------------------------------

        area_weight = weights["area"]

        area_similarity = self._area_similarity(
            requested_area=requested_area,
            candidate_area=candidate.get(
                "relevant_area"
            ),
        )

        weighted_score += (
            area_similarity
            * area_weight
        )

        total_weight += area_weight

        # ---------------------------------------------------------
        # Structured numeric features
        # ---------------------------------------------------------

        numeric_features = {
            "levels": levels,
            "bathrooms": bathrooms,
            "kitchens": kitchens,
        }

        for (
            feature_name,
            requested_value,
        ) in numeric_features.items():
            if requested_value is None:
                continue

            feature_weight = weights[
                feature_name
            ]

            candidate_value = candidate.get(
                feature_name
            )

            feature_similarity = (
                self._numeric_similarity(
                    requested_value=requested_value,
                    candidate_value=candidate_value,
                )
            )

            weighted_score += (
                feature_similarity
                * feature_weight
            )

            total_weight += (
                feature_weight
            )

        if total_weight <= 0:
            return Decimal("0")

        core_similarity = (
            weighted_score
            / total_weight
        )

        # ---------------------------------------------------------
        # Positive historical scope evidence
        #
        # FALSE in a notes-derived feature means
        # "not mentioned", not necessarily "absent".
        #
        # Therefore:
        # - requested TRUE + historical mention -> bonus
        # - requested TRUE + no mention -> no penalty
        # - requested FALSE -> feature ignored
        # ---------------------------------------------------------

        bonus = Decimal("0")

        bonus_rules = (
            self.POSITIVE_SCOPE_BONUSES.get(
                project_type,
                {},
            )
        )

        for (
            request_field,
            rule,
        ) in bonus_rules.items():
            (
                candidate_column,
                feature_bonus,
            ) = rule

            requested_value = getattr(
                scope,
                request_field,
                None,
            )

            if requested_value is not True:
                continue

            if candidate.get(
                candidate_column
            ) is True:
                bonus += feature_bonus

        similarity = (
            core_similarity
            + bonus
        )

        # ---------------------------------------------------------
        # Historical category relevance
        #
        # For pure Extension assessments, historical pure Extension
        # projects are the strongest evidence.
        #
        # Renovation + Extension projects are still useful, but are
        # slightly less directly comparable.
        # ---------------------------------------------------------

        category_multiplier = (
            self._category_multiplier(
                project_type=project_type,
                historical_category=candidate.get(
                    "feasibility_category"
                ),
            )
        )

        similarity *= category_multiplier

        # ---------------------------------------------------------
        # Scope exclusions
        #
        # Historical notes containing exclusions make text-derived
        # scope features slightly less certain.
        # ---------------------------------------------------------

        if candidate.get(
            "has_scope_exclusions"
        ):
            similarity *= Decimal("0.97")

        # ---------------------------------------------------------
        # Clamp to 0..1
        # ---------------------------------------------------------

        return max(
            Decimal("0"),
            min(
                Decimal("1"),
                similarity,
            ),
        )

    @staticmethod
    def _category_multiplier(
        project_type: str,
        historical_category: str | None,
    ) -> Decimal:
        if project_type == "extension":
            if (
                historical_category
                == "extension"
            ):
                return Decimal("1.00")

            if (
                historical_category
                == "renovation_and_extension"
            ):
                return Decimal("0.90")

        return Decimal("1.00")

    def _area_similarity(
        self,
        requested_area: Decimal,
        candidate_area,
    ) -> Decimal:
        if candidate_area is None:
            return (
                self.MISSING_FEATURE_SIMILARITY
            )

        candidate_area = self._decimal(
            candidate_area
        )

        if (
            requested_area <= 0
            or candidate_area <= 0
        ):
            return Decimal("0")

        relative_difference = (
            abs(
                candidate_area
                - requested_area
            )
            / requested_area
        )

        return max(
            Decimal("0"),
            Decimal("1")
            - relative_difference,
        )

    def _numeric_similarity(
        self,
        requested_value: int,
        candidate_value,
    ) -> Decimal:
        if candidate_value is None:
            return (
                self.MISSING_FEATURE_SIMILARITY
            )

        try:
            candidate_value = int(
                candidate_value
            )
        except (
            TypeError,
            ValueError,
        ):
            return (
                self.MISSING_FEATURE_SIMILARITY
            )

        difference = abs(
            candidate_value
            - requested_value
        )

        if difference == 0:
            return Decimal("1")

        if difference == 1:
            return Decimal("0.60")

        if difference == 2:
            return Decimal("0.25")

        return Decimal("0")

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