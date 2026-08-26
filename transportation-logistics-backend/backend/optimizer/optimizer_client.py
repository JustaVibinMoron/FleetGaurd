import httpx

from backend.config.settings import get_settings
from backend.maps.osrm_client import get_route
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


def _positive_number(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _is_reported_disruption(context: dict) -> bool:
    text = " ".join(
        str(context.get(key) or "")
        for key in ("problem", "currentRouteStatus")
    ).lower()
    return any(word in text for word in ("block", "closure", "accident", "congestion", "delay"))


def _capacity_check(context: dict) -> tuple[float | None, float | None]:
    capacity = _positive_number(context.get("truckCapacityKg"))
    current_load = _positive_number(context.get("currentLoadKg")) or 0.0
    if capacity is not None and current_load > capacity:
        raise AppError(
            "OPTIMIZER_CAPACITY_EXCEEDED",
            "Truck currentLoadKg exceeds truckCapacityKg; route cannot be optimized",
            422,
        )
    return capacity, current_load


def _osrm_route(context: dict) -> dict | None:
    coordinate_keys = (
        "originLongitude",
        "originLatitude",
        "destinationLongitude",
        "destinationLatitude",
    )
    if any(context.get(key) is None for key in coordinate_keys):
        return None

    try:
        return get_route(
            start_lon=context["originLongitude"],
            start_lat=context["originLatitude"],
            end_lon=context["destinationLongitude"],
            end_lat=context["destinationLatitude"],
        )
    except AppError:
        return None


def deterministic_optimize(context: dict) -> dict:
    """Create a repeatable route recommendation from route and truck context."""
    capacity, current_load = _capacity_check(context)
    osrm_route = _osrm_route(context)
    recorded_distance = _positive_number(context.get("distanceKm"))
    recorded_time = _positive_number(context.get("estimatedTimeMinutes"))
    distance = (osrm_route or {}).get("distanceKm") or recorded_distance or 100.0
    base_time = (osrm_route or {}).get("durationMinutes") or recorded_time or max(distance / 45.0 * 60.0, 20.0)

    status = str(context.get("currentRouteStatus") or "ACTIVE").upper()
    status_multiplier = {
        "BLOCKED": 1.35,
        "DELAYED": 1.15,
        "ALTERNATIVE": 1.05,
    }.get(status, 1.0)
    if _is_reported_disruption(context) and status_multiplier == 1.0:
        status_multiplier = 1.15

    priority = str(context.get("deliveryPriority") or "normal").lower()
    priority_multiplier = {"high": 0.95, "urgent": 0.90, "low": 1.10}.get(priority, 1.0)
    estimated_time = max(20, round(base_time * status_multiplier * priority_multiplier))

    origin = str(context.get("origin") or "Origin")
    destination = str(context.get("destination") or "Destination")
    route_label = "OSRM driving route" if osrm_route else "recorded route fallback"
    recommendation = "{0} -> {1} via {2}".format(origin, destination, route_label)

    if osrm_route and recorded_distance:
        fuel_saving = round(max(0.0, (recorded_distance - distance) / recorded_distance * 100), 1)
    else:
        fuel_saving = 0.0

    notes = ["{0} estimate".format("OSRM" if osrm_route else "Stored-route")]
    if not osrm_route:
        notes.append("OSRM unavailable or coordinates not supplied; fallback retained")
    if _is_reported_disruption(context):
        notes.append("disruption allowance applied")
    if priority in {"high", "urgent", "low"}:
        notes.append("{0} priority policy applied".format(priority))
    if capacity is not None:
        notes.append("load {0:.0f}/{1:.0f} kg within capacity".format(current_load, capacity))

    return {
        "recommendedRoute": recommendation,
        "estimatedTime": estimated_time,
        "fuelSaving": fuel_saving,
        "reason": "; ".join(notes),
        "waypoints": [origin, destination],
        "distanceKm": round(float(distance), 3),
        "source": "deterministic",
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
