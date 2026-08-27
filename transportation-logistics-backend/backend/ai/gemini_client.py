import json
from typing import Literal

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from backend.config.settings import get_settings
from backend.utils.exceptions import AppError


class GeminiDecisionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, strict=True)

    decision: Literal["MAINTAIN", "REROUTE", "DELAY", "URGENT_ACTION"]
    risk: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    recommended_route: str = Field(alias="recommendedRoute")
    estimated_time: int = Field(alias="estimatedTime", ge=1)
    fuel_saving: float = Field(alias="fuelSaving", ge=0)
    reason: str = Field(min_length=1, max_length=2000)
    actions: list[str] = Field(min_length=1, max_length=10)


RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "decision": {"type": "STRING", "enum": ["MAINTAIN", "REROUTE", "DELAY", "URGENT_ACTION"]},
        "risk": {"type": "STRING", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]},
        "recommendedRoute": {"type": "STRING"},
        "estimatedTime": {"type": "INTEGER"},
        "fuelSaving": {"type": "NUMBER"},
        "reason": {"type": "STRING"},
        "actions": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": [
        "decision",
        "risk",
        "recommendedRoute",
        "estimatedTime",
        "fuelSaving",
        "reason",
        "actions",
    ],
}


def _analysis_context(context: dict) -> dict:
    return {
        "origin": context.get("origin"),
        "destination": context.get("destination"),
        "routeStatus": context.get("currentRouteStatus"),
        "problem": context.get("problem"),
        "deliveryPriority": context.get("deliveryPriority"),
        "deliveryStatus": context.get("deliveryStatus"),
        "truck": {
            "capacityKg": context.get("truckCapacityKg"),
            "currentLoadKg": context.get("currentLoadKg"),
            "status": context.get("truckStatus"),
            "location": context.get("truckLocation"),
        },
        "optimizer": {
            "recommendedRoute": context.get("optimizerRecommendation"),
            "estimatedTime": context.get("optimizerEstimatedTime"),
            "fuelSaving": context.get("optimizerFuelSaving"),
            "reason": context.get("optimizerReason"),
        },
    }


def _extract_text(payload: dict) -> str:
    try:
        return payload["candidates"][0]["content"]["parts"][0]["text"]
    except (IndexError, KeyError, TypeError) as exc:
        raise AppError("AI_INVALID_RESPONSE", "Gemini returned no structured candidate", 502) from exc


def _validate_decision(payload: dict, context: dict) -> dict:
    try:
        decision = GeminiDecisionResponse.model_validate(payload)
    except ValidationError as exc:
        raise AppError("AI_INVALID_RESPONSE", "Gemini response failed decision validation", 502) from exc

    optimizer_route = context.get("optimizerRecommendation")
    optimizer_time = context.get("optimizerEstimatedTime")
    optimizer_fuel = context.get("optimizerFuelSaving")

    expected = {
        "recommendedRoute": optimizer_route,
        "estimatedTime": optimizer_time,
        "fuelSaving": optimizer_fuel,
    }

    received = decision.model_dump(by_alias=True)
    if any(received[key] != value for key, value in expected.items()):
        raise AppError(
            "AI_INVALID_RESPONSE",
            "Gemini must preserve the deterministic optimizer route, ETA, and fuel estimate",
            502,
        )
    return {**received, "source": "gemini"}


def gemini_recommend(context: dict) -> dict:
    settings = get_settings()
    if not settings.gemini_api_key.strip():
        raise AppError("AI_NOT_CONFIGURED", "GEMINI_API_KEY is not configured", 503)

    prompt = (
        "You are FleetGuard decision support. Analyze the deterministic optimizer result only. "
        "Do not calculate a route, invent geometry, coordinates, waypoints, or change the optimizer "
        "recommendation, ETA, or fuel estimate. Return JSON matching the required schema.\n\n"
        + json.dumps(_analysis_context(context), separators=(",", ":"))
    )
    request_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
            "temperature": 0,
        },
    }
    url = "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent".format(
        settings.gemini_model
    )
    try:
        response = httpx.post(
            url,
            headers={"x-goog-api-key": settings.gemini_api_key},
            json=request_payload,
            timeout=settings.ai_timeout_seconds,
        )
        response.raise_for_status()
        model_payload = json.loads(_extract_text(response.json()))
    except httpx.HTTPError as exc:
        raise AppError("AI_UNAVAILABLE", "Gemini request failed: {0}".format(exc), 503) from exc
    except json.JSONDecodeError as exc:
        raise AppError("AI_INVALID_RESPONSE", "Gemini did not return JSON", 502) from exc

    return _validate_decision(model_payload, context)
