import unittest
from decimal import Decimal
from unittest.mock import Mock
from uuid import uuid4

from app.schemas.combined_feasibility import CombinedFeasibilityRequest
from app.schemas.feasibility import FeasibilityResponse
from app.services.combined_feasibility_service import assess_combined


def made_up_result(project_type, area, costs):
    return FeasibilityResponse(
        assessment_id=uuid4(), session_id=uuid4(),
        project_type=project_type, status="completed",
        estimate={
            "low": costs[0], "typical": costs[1], "high": costs[2],
            "low_per_sqm": Decimal(costs[0]) / area,
            "typical_per_sqm": Decimal(costs[1]) / area,
            "high_per_sqm": Decimal(costs[2]) / area,
            "pricing_area": area, "pricing_area_basis": "affected_area",
        },
        budget=None,
        evidence={
            "comparable_count": 5, "confidence": "low",
            "confidence_label": "Low Confidence", "confidence_score": 40,
            "average_similarity": Decimal("0.8"),
        },
        assessment={"summary": "made-up test result", "matched_scope_characteristics": []},
        assumptions=["made-up data for testing"],
    )


class CombinedFeasibilityServiceTests(unittest.TestCase):
    def setUp(self):
        self.request = CombinedFeasibilityRequest.model_validate({
            "renovation": {
                "area": {"affected_area": 50},
                "layout": {"bathrooms": 1}, "scope": {"recladding": True},
            },
            "extension": {
                "area": {"affected_area": 30},
                "layout": {"bathrooms": 2}, "scope": {"roofing": True},
            },
        })
        self.renovation = made_up_result("renovation", 50, ("80000.10", "100000.20", "120000.30"))
        self.extension = made_up_result("extension", 30, ("90000.15", "120000.25", "150000.35"))
        # this stand-in never connects to the database
        self.service = Mock()
        self.service.assess.side_effect = [self.renovation, self.extension]

    def test_adds_costs_and_keeps_both_results(self):
        result = assess_combined(self.request, self.service)
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.estimate.low, Decimal("170000.25"))
        self.assertEqual(result.estimate.typical, Decimal("220000.45"))
        self.assertEqual(result.estimate.high, Decimal("270000.65"))
        self.assertEqual(result.renovation, self.renovation)
        self.assertEqual(result.extension, self.extension)
        self.assertIsNone(result.budget)
        self.service._assess_budget.assert_not_called()

    def test_passes_separate_answers_and_shared_session(self):
        self.request.session_id = uuid4()
        result = assess_combined(self.request, self.service)
        calls = self.service.assess.call_args_list
        self.assertEqual(len(calls), 2)
        for call, project_type in zip(calls, ("renovation", "extension")):
            part_request = call.args[0]
            original = getattr(self.request, project_type)
            self.assertEqual(part_request.project_type, project_type)
            self.assertEqual(part_request.area, original.area)
            self.assertEqual(part_request.layout, original.layout)
            self.assertEqual(part_request.scope, original.scope)
            self.assertEqual(part_request.session_id, self.request.session_id)
            self.assertIsNone(part_request.budget)
        self.assertEqual(result.session_id, self.request.session_id)

    def test_checks_budget_against_combined_cost(self):
        self.request.budget = Decimal("250000")
        self.service._assess_budget.return_value = {
            "amount": "250000", "difference_from_typical": "29999.55",
            "difference_percent": "13.64", "verdict": "feasible",
            "verdict_label": "Feasible",
        }
        result = assess_combined(self.request, self.service)
        self.service._assess_budget.assert_called_once_with(
            budget=Decimal("250000"), low_estimate=Decimal("170000.25"),
            typical_estimate=Decimal("220000.45"),
        )
        self.assertEqual(result.budget.amount, self.request.budget)

    def test_no_total_when_either_part_has_insufficient_data(self):
        for project_type in ("renovation", "extension"):
            with self.subTest(project_type=project_type):
                self.setUp()
                self.request.budget = Decimal("250000")
                part = getattr(self, project_type)
                part.status = "insufficient_data"
                part.estimate = None
                result = assess_combined(self.request, self.service)
                self.assertEqual(result.status, "insufficient_data")
                self.assertIsNone(result.estimate)
                self.assertIsNone(result.budget)
                self.assertIsNotNone(getattr(result, "extension" if project_type == "renovation" else "renovation").estimate)
                self.service._assess_budget.assert_not_called()


if __name__ == "__main__":
    unittest.main()
