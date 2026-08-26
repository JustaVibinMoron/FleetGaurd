import httpx

from backend.config.settings import get_settings
from backend.utils.exceptions import AppError

REQUIRED_KEYS = {"recommendedRoute", "estimatedTime", "reason"}


def _validate(payload: dict) -> dict:
    missing = REQUIRED_KEYS - set(payload.keys())
    if missing:
        raise AppError(
            "OPTIMIZER_INVALID_RESPONSE",
            "Optimizer response missing keys: {0}".format(sorted(missing)),
            502,
        )
    return payload


def stub_optimize(context: dict) -> dict:
    distance = float(context.get("distanceKm") or 100)
    return {
        "recommendedRoute": "{0} -> highway -> {1}".format(
            context.get("origin"), context.get("destination")
        ),
        "estimatedTime": int(max(distance * 1.2, 20)),
        "fuelSaving": 8.5,
        "reason": "Stub optimizer: prefers highway legs over congested city roads",
        "waypoints": [context.get("origin"), context.get("destination")],
        "source": "stub",
    }


def http_optimize(context: dict) -> dict:
    settings = get_settings()
    try:
        response = httpx.post(
            "{0}/optimize".format(settings.optimizer_url.rstrip("/")),
            json=context,
            timeout=settings.optimizer_timeout_seconds,
        )
        response.raise_for_status()
        return _validate(response.json())
    except httpx.HTTPError as exc:
        raise AppError("OPTIMIZER_UNAVAILABLE", "Optimizer request failed: {0}".format(exc), 503) from exc


def function_optimize(context: dict) -> dict:
    try:
        from route_optimizer import optimize_route  # type: ignore
    except ImportError as exc:
        raise AppError(
            "OPTIMIZER_UNAVAILABLE",
            "OPTIMIZER_MODE=function but package 'route_optimizer' is not installed",
            503,
        ) from exc
    return _validate(optimize_route(context))
