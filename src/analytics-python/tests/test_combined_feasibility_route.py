import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


class CombinedFeasibilityRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # no .env file, real database or storage credentials in these tests
        settings = SimpleNamespace(
            database_connection_string="unused", database_pool_min_size=1,
            database_pool_max_size=1, supabase_url="https://example.invalid",
            supabase_service_role_key="made-up", feasibility_storage_bucket="test",
            feasibility_max_files=5, feasibility_max_file_size_bytes=1000,
        )
        pool = Mock()
        pool.connection.side_effect = AssertionError("tests must not use a database")
        with patch("app.core.config.get_settings", return_value=settings), \
                patch("psycopg_pool.ConnectionPool", return_value=pool):
            from app.routes import feasibility
        cls.routes = feasibility

    def setUp(self):
        self.answers = {
            "renovation": {
                "area": {"affected_area": 50},
                "layout": {"levels": 1, "bathrooms": 1, "kitchens": 1},
                "scope": {},
            },
            "extension": {
                "area": {"affected_area": 30},
                "layout": {"levels": 1, "bathrooms": 1, "kitchens": 1},
                "scope": {},
            },
            "budget": 250000,
        }
        # five invented matches per part, fed through the real calculation
        self.repository = Mock()
        self.repository.get_candidates.side_effect = [
            self.candidates(50, 2000), self.candidates(30, 4000),
        ]
        service = self.routes.FeasibilityService(self.repository)
        service_patch = patch.object(self.routes, "feasibility_service", service)
        service_patch.start()
        self.addCleanup(service_patch.stop)
        app = FastAPI()
        app.include_router(self.routes.router)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    @staticmethod
    def candidates(area, rate):
        return [
            {"relevant_area": area, "selling_per_relevant_sqm": rate,
             "levels": 1, "bathrooms": 1, "kitchens": 1}
            for _ in range(5)
        ]

    def test_returns_separate_costs_and_combined_budget(self):
        response = self.client.post("/api/feasibility/assess-combined", json=self.answers)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["renovation"]["estimate"]["typical"], "100000.00")
        self.assertEqual(result["extension"]["estimate"]["typical"], "120000.00")
        self.assertEqual(result["estimate"]["typical"], "220000.00")
        self.assertEqual(result["budget"]["difference_from_typical"], "30000.00")
        self.assertEqual(result["budget"]["verdict"], "feasible")
        for part in ("renovation", "extension"):
            self.assertEqual(result[part]["session_id"], result["session_id"])
            self.assertIsNone(result[part]["budget"])
        self.assertNotEqual(result["renovation"]["assessment_id"], result["extension"]["assessment_id"])
        self.assertEqual(self.repository.create_assessment_log.call_count, 2)

    def test_rejects_missing_extension_before_calculating(self):
        del self.answers["extension"]
        response = self.client.post("/api/feasibility/assess-combined", json=self.answers)
        self.assertEqual(response.status_code, 422)
        self.repository.get_candidates.assert_not_called()
        self.repository.create_assessment_log.assert_not_called()

    def test_rejects_zero_area_before_calculating(self):
        self.answers["renovation"]["area"]["affected_area"] = 0
        response = self.client.post("/api/feasibility/assess-combined", json=self.answers)
        self.assertEqual(response.status_code, 422)
        self.repository.get_candidates.assert_not_called()

    def test_missing_matches_do_not_produce_a_partial_total(self):
        self.repository.get_candidates.side_effect = [self.candidates(50, 2000), []]
        response = self.client.post("/api/feasibility/assess-combined", json=self.answers)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["status"], "insufficient_data")
        self.assertIsNone(result["estimate"])
        self.assertIsNone(result["budget"])
        self.assertIsNotNone(result["renovation"]["estimate"])
        self.assertIsNone(result["extension"]["estimate"])

    def test_existing_single_assessment_still_works(self):
        answers = {"project_type": "renovation", **self.answers["renovation"]}
        response = self.client.post("/api/feasibility/assess", json=answers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["estimate"]["typical"], "100000.00")
        self.assertEqual(self.repository.create_assessment_log.call_count, 1)


if __name__ == "__main__":
    unittest.main()
