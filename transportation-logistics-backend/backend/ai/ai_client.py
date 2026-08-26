import httpx

from backend.config.settings import get_settings
from backend.utils.exceptions import AppError

REQUIRED_KEYS = {"recommendedRoute", "estimatedTime", "reason"}


def _validate(payload: dict) -> dict:
    missing = REQUIRED_KEYS - set(payload.keys())
    if missing:
        raise AppError(
            "AI_INVALID_RESPONSE",
            "AI module response missing keys: {0}".format(sorted(missing)),
            502,
        )
    return payload


def stub_recommend(context: dict) -> dict:
    origin = context.get("origin", "?")
    destination = context.get("destination", "?")
    problem = context.get("problem") or "none"
    return {
        "recommendedRoute": "Alternative Route {0} -> {1}".format(origin, destination),
        "estimatedTime": max(int(context.get("estimatedTimeMinutes") or 60) - 15, 30),
        "fuelSaving": 15,
        "reason": "Stub AI: avoids reported problem '{0}'".format(problem),
        "source": "stub",
    }


def http_recommend(context: dict) -> dict:
    settings = get_settings()
    try:
        response = httpx.post(
            "{0}/optimize".format(settings.ai_module_url.rstrip("/")),
            json=context,
            timeout=settings.ai_timeout_seconds,
        )
        response.raise_for_status()
        return _validate(response.json())
    except httpx.HTTPError as exc:
        raise AppError("AI_UNAVAILABLE", "AI module request failed: {0}".format(exc), 503) from exc
