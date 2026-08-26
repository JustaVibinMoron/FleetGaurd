"""
OSRM HTTP client.

Talks to an OSRM route server over HTTP. API routes should call get_route()
and never build OSRM URLs themselves.
"""

import httpx

from backend.config.settings import get_settings
from backend.utils.exceptions import AppError


def get_route(start_lon, start_lat, end_lon, end_lat):
    """
    Request a driving route from OSRM.

    OSRM expects longitude,latitude (not lat,lon) in the path.
    """
    settings = get_settings()
    base_url = settings.osrm_url.rstrip("/")
    coordinates = "{0},{1};{2},{3}".format(start_lon, start_lat, end_lon, end_lat)
    url = "{0}/route/v1/driving/{1}".format(base_url, coordinates)

    try:
        response = httpx.get(
            url,
            params={"overview": "full", "geometries": "geojson"},
            timeout=settings.osrm_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise AppError("OSRM_UNAVAILABLE", "OSRM request failed: {0}".format(exc), 503) from exc

    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise AppError(
            "OSRM_NO_ROUTE",
            "OSRM could not find a route for these coordinates",
            404,
        )

    route = payload["routes"][0]
    return {
        "distanceKm": round(float(route["distance"]) / 1000.0, 3),
        "durationMinutes": round(float(route["duration"]) / 60.0, 1),
        "geometry": route.get("geometry"),
    }
