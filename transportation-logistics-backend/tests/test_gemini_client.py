import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx

from backend.ai.ai_service import request_ai_recommendation
from backend.ai.gemini_client import gemini_recommend
from backend.utils.exceptions import AppError


CONTEXT = {
    "origin": "Delhi",
    "destination": "Mumbai",
    "currentRouteStatus": "DELAYED",
    "problem": "Congestion",
    "deliveryPriority": "high",
    "deliveryStatus": "IN_TRANSIT",
    "truckCapacityKg": 10000,
    "currentLoadKg": 7000,
    "truckStatus": "IN_TRANSIT",
    "truckLocation": "Delhi",
    "optimizerRecommendation": "Delhi -> Mumbai via OSRM driving route",
    "optimizerEstimatedTime": 1200,
    "optimizerFuelSaving": 10.0,
    "optimizerReason": "OSRM estimate",
}

VALID_DECISION = {
    "decision": "DELAY",
    "risk": "HIGH",
    "recommendedRoute": CONTEXT["optimizerRecommendation"],
    "estimatedTime": CONTEXT["optimizerEstimatedTime"],
    "fuelSaving": CONTEXT["optimizerFuelSaving"],
    "reason": "Congestion may delay arrival.",
    "actions": ["Notify the dispatcher."],
}


def _settings(api_key="test-key", mode="gemini"):
    return SimpleNamespace(
        gemini_api_key=api_key,
        gemini_model="gemini-2.0-flash",
        ai_timeout_seconds=5,
        ai_mode=mode,
    )


def _response(decision):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"candidates": [{"content": {"parts": [{"text": __import__("json").dumps(decision)}]}}]}
    return response


class GeminiClientTests(unittest.TestCase):
    @patch("backend.ai.gemini_client.get_settings", return_value=_settings())
    @patch("backend.ai.gemini_client.httpx.post")
    def test_valid_response_is_returned(self, post, _settings_mock):
        post.return_value = _response(VALID_DECISION)

        result = gemini_recommend(CONTEXT)

        self.assertEqual(result["decision"], "DELAY")
        self.assertEqual(result["risk"], "HIGH")
        self.assertEqual(result["source"], "gemini")

    @patch("backend.ai.gemini_client.get_settings", return_value=_settings())
    @patch("backend.ai.gemini_client.httpx.post")
    def test_none_fuel_saving_is_normalized(self, post, _settings_mock):
        """When the optimizer returns fuelSaving=None, Gemini returning 0.0 should pass validation."""
        ctx = {**CONTEXT, "optimizerFuelSaving": None}
        decision = {**VALID_DECISION, "fuelSaving": 0.0}
        post.return_value = _response(decision)

        result = gemini_recommend(ctx)

        self.assertEqual(result["source"], "gemini")
        self.assertEqual(result["fuelSaving"], 0.0)

    @patch("backend.ai.gemini_client.get_settings", return_value=_settings())
    @patch("backend.ai.gemini_client.httpx.post")
    def test_invalid_schema_is_rejected(self, post, _settings_mock):
        invalid = {**VALID_DECISION, "decision": "GO_NOW"}
        post.return_value = _response(invalid)

        with self.assertRaises(AppError) as error:
            gemini_recommend(CONTEXT)

        self.assertEqual(error.exception.code, "AI_INVALID_RESPONSE")

    @patch("backend.ai.gemini_client.get_settings", return_value=_settings())
    @patch("backend.ai.gemini_client.httpx.post", side_effect=httpx.TimeoutException("timeout"))
    def test_timeout_is_reported(self, _post, _settings_mock):
        with self.assertRaises(AppError) as error:
            gemini_recommend(CONTEXT)

        self.assertEqual(error.exception.code, "AI_UNAVAILABLE")

    @patch("backend.ai.gemini_client.get_settings", return_value=_settings(api_key=""))
    def test_missing_api_key_is_rejected(self, _settings_mock):
        with self.assertRaises(AppError) as error:
            gemini_recommend(CONTEXT)

        self.assertEqual(error.exception.code, "AI_NOT_CONFIGURED")

    @patch("backend.ai.ai_service.get_settings", return_value=_settings())
    @patch(
        "backend.ai.gemini_client.gemini_recommend",
        side_effect=AppError("AI_UNAVAILABLE", "offline", 503),
    )
    def test_service_returns_optimizer_fallback(self, _recommend, _settings_mock):
        optimizer = {
            "recommendedRoute": CONTEXT["optimizerRecommendation"],
            "estimatedTime": CONTEXT["optimizerEstimatedTime"],
            "fuelSaving": CONTEXT["optimizerFuelSaving"],
        }

        result = request_ai_recommendation(CONTEXT, optimizer)

        self.assertEqual(result["source"], "ai-fallback")
        self.assertEqual(result["recommendedRoute"], optimizer["recommendedRoute"])
        self.assertEqual(result["aiError"]["code"], "AI_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
