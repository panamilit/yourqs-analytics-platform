import unittest
from decimal import Decimal

from pydantic import ValidationError

from app.schemas.combined_feasibility import CombinedFeasibilityRequest


class CombinedFeasibilityRequestTests(unittest.TestCase):
    def setUp(self):
        # made-up answers
        self.answers = {
            "project_type": "renovation_and_extension",
            "renovation": {
                "area": {"floor_area": 180, "affected_area": 50},
                "layout": {"levels": 1, "bathrooms": 1, "kitchens": 1},
                "scope": {"demolition": True, "recladding": True},
            },
            "extension": {
                "area": {"floor_area": 180, "affected_area": 30},
                "layout": {"levels": 2, "bathrooms": 2, "kitchens": 0},
                "scope": {"demolition": False, "roofing": True},
            },
            "budget": 300000,
        }

    def test_keeps_each_parts_answers_separate(self):
        request = CombinedFeasibilityRequest.model_validate(self.answers)

        self.assertEqual(request.renovation.area.affected_area, Decimal("50"))
        self.assertEqual(request.extension.area.affected_area, Decimal("30"))
        self.assertEqual(request.renovation.layout.bathrooms, 1)
        self.assertEqual(request.extension.layout.bathrooms, 2)
        self.assertTrue(request.renovation.scope.demolition)
        self.assertFalse(request.extension.scope.demolition)
        self.assertTrue(request.renovation.scope.recladding)
        self.assertTrue(request.extension.scope.roofing)
        self.assertEqual(request.budget, Decimal("300000"))

    def test_requires_both_parts(self):
        for part in ("renovation", "extension"):
            with self.subTest(part=part):
                answers = self.answers.copy()
                del answers[part]
                with self.assertRaises(ValidationError):
                    CombinedFeasibilityRequest.model_validate(answers)

    def test_whole_house_area_cannot_replace_either_work_area(self):
        for part in ("renovation", "extension"):
            with self.subTest(part=part):
                self.setUp()
                del self.answers[part]["area"]["affected_area"]
                with self.assertRaises(ValidationError):
                    CombinedFeasibilityRequest.model_validate(self.answers)

    def test_rejects_missing_zero_or_negative_work_area(self):
        for part in ("renovation", "extension"):
            for area in (None, 0, -10):
                with self.subTest(part=part, area=area):
                    self.setUp()
                    self.answers[part]["area"]["affected_area"] = area
                    with self.assertRaises(ValidationError):
                        CombinedFeasibilityRequest.model_validate(self.answers)

    def test_budget_is_optional(self):
        del self.answers["budget"]
        request = CombinedFeasibilityRequest.model_validate(self.answers)
        self.assertIsNone(request.budget)

    def test_rejects_zero_or_negative_budget(self):
        for budget in (0, -100):
            with self.subTest(budget=budget):
                self.answers["budget"] = budget
                with self.assertRaises(ValidationError):
                    CombinedFeasibilityRequest.model_validate(self.answers)


if __name__ == "__main__":
    unittest.main()
