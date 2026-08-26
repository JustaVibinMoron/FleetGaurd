import unittest
from unittest.mock import patch

from backend.schemas.simulation import ScenarioType
from backend.services.simulation_service import build_scenario_context, run_scenario


class SimulationServiceTests(unittest.TestCase):
    def test_normal_case(self):
        result = run_scenario(ScenarioType.NORMAL)
        self.assertTrue(result["simulated"])
        self.assertTrue(result["feasible"])
        self.assertEqual(result["analytics"]["lateDeliveries"], 0)

    def test_heavy_traffic(self):
        result = run_scenario(ScenarioType.HEAVY_TRAFFIC)
        self.assertEqual(result["optimizerContext"]["currentRouteStatus"], "DELAYED")
        self.assertGreater(result["baseline"]["estimatedTimeMinutes"], 120)
        self.assertGreater(result["analytics"]["delayReductionMinutes"], 0)

    def test_road_closure(self):
        result = run_scenario(ScenarioType.ROAD_CLOSURE)
        self.assertEqual(result["optimizerContext"]["currentRouteStatus"], "BLOCKED")
        self.assertGreater(result["analytics"]["distanceReductionKm"], 0)

    def test_vehicle_breakdown(self):
        result = run_scenario(ScenarioType.VEHICLE_BREAKDOWN)
        self.assertIn("breakdown", result["optimizerContext"]["problem"].lower())
        self.assertTrue(result["feasible"])

    def test_overloaded_vehicle(self):
        result = run_scenario(ScenarioType.OVERLOADED_VEHICLE)
        self.assertFalse(result["feasible"])
        self.assertEqual(result["failure"]["code"], "OPTIMIZER_CAPACITY_EXCEEDED")

    def test_urgent_delivery(self):
        result = run_scenario(ScenarioType.URGENT_DELIVERY)
        self.assertEqual(result["optimizerContext"]["deliveryPriority"], "urgent")
        self.assertLess(result["optimized"]["estimatedTime"], 120)

    def test_impossible_overdue_delivery(self):
        result = run_scenario(ScenarioType.IMPOSSIBLE_OVERDUE_DELIVERY)
        self.assertFalse(result["feasible"])
        self.assertEqual(result["analytics"]["lateDeliveries"], 1)

    def test_context_is_optimizer_compatible(self):
        context = build_scenario_context(ScenarioType.NORMAL)
        self.assertTrue({"origin", "destination", "distanceKm", "estimatedTimeMinutes"}.issubset(context))


if __name__ == "__main__":
    unittest.main()
