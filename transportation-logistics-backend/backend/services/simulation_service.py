"""Synthetic scenario runs for demos and automated optimizer checks.

No values here represent observed fleet performance.  A scenario creates a
repeatable optimizer context and compares its returned plan against an explicit
simulated baseline with the same starting route.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from backend.optimizer.optimizer_client import deterministic_optimize
from backend.schemas.simulation import ScenarioType
from backend.utils.exceptions import AppError


SCENARIO_RULES = {
    ScenarioType.NORMAL: {"status": "ACTIVE", "priority": "normal", "problem": "Normal traffic", "distance": 1.0, "time": 1.0},
    ScenarioType.HEAVY_TRAFFIC: {"status": "DELAYED", "priority": "normal", "problem": "Heavy traffic congestion", "distance": 1.0, "time": 1.45},
    ScenarioType.ROAD_CLOSURE: {"status": "BLOCKED", "priority": "normal", "problem": "Road closure; baseline uses a detour", "distance": 1.20, "time": 1.80},
    ScenarioType.VEHICLE_BREAKDOWN: {"status": "DELAYED", "priority": "normal", "problem": "Vehicle breakdown; replacement dispatch required", "distance": 1.05, "time": 1.50},
    ScenarioType.URGENT_DELIVERY: {"status": "ACTIVE", "priority": "urgent", "problem": "Urgent high-priority delivery", "distance": 1.0, "time": 1.0},
    ScenarioType.OVERLOADED_VEHICLE: {"status": "ACTIVE", "priority": "normal", "problem": "Overloaded vehicle", "distance": 1.0, "time": 1.0, "overloaded": True},
    ScenarioType.IMPOSSIBLE_OVERDUE_DELIVERY: {"status": "BLOCKED", "priority": "urgent", "problem": "Road closure with an already overdue delivery deadline", "distance": 1.20, "time": 1.80, "impossible": True},
}


def build_scenario_context(
    scenario: ScenarioType,
    distance_km: float = 100.0,
    estimated_time_minutes: int = 120,
) -> dict:
    """Return synthetic data in the optimizer's existing context contract."""
    rule = SCENARIO_RULES[scenario]
    load = 12_000.0 if rule.get("overloaded") else 7_000.0
    return {
        "simulated": True,
        "scenario": scenario.value,
        "origin": "Simulated Depot",
        "destination": "Simulated Customer",
        "truckCapacityKg": 10_000.0,
        "currentLoadKg": load,
        "distanceKm": round(distance_km, 3),
        "estimatedTimeMinutes": estimated_time_minutes,
        "currentRouteStatus": rule["status"],
        "deliveryPriority": rule["priority"],
        "problem": rule["problem"],
    }


def _baseline(context: dict, rule: dict, fuel_liters: Optional[float]) -> dict:
    distance = round(context["distanceKm"] * rule["distance"], 3)
    time = max(1, round(context["estimatedTimeMinutes"] * rule["time"]))
    deadline = 0 if rule.get("impossible") else time + 30
    return {
        "distanceKm": distance,
        "estimatedTimeMinutes": time,
        "fuelLiters": fuel_liters,
        "deadlineMinutesFromNow": deadline,
    }


def _analytics(baseline: dict, optimized: dict, fuel_liters: Optional[float]) -> dict:
    optimized_distance = float(optimized.get("distanceKm", baseline["distanceKm"]))
    optimized_time = int(optimized["estimatedTime"])
    baseline_distance = baseline["distanceKm"]
    baseline_time = baseline["estimatedTimeMinutes"]
    fuel_saving_percent = optimized.get("fuelSaving")
    fuel_saved = None
    if fuel_liters is not None and fuel_saving_percent is not None:
        fuel_saved = round(fuel_liters * max(0.0, float(fuel_saving_percent)) / 100, 3)
    return {
        "simulated": True,
        "totalDistanceKm": round(optimized_distance, 3),
        "estimatedTravelDeliveryTimeMinutes": optimized_time,
        "lateDeliveries": int(optimized_time > baseline["deadlineMinutesFromNow"]),
        "distanceReductionKm": round(max(0.0, baseline_distance - optimized_distance), 3),
        "distanceReductionPercent": round(max(0.0, baseline_distance - optimized_distance) / baseline_distance * 100, 2),
        "delayReductionMinutes": max(0, baseline_time - optimized_time),
        "delayReductionPercent": round(max(0, baseline_time - optimized_time) / baseline_time * 100, 2),
        "fuelSavingPercent": fuel_saving_percent,
        "fuelSavedLiters": fuel_saved,
    }


def run_scenario(
    scenario: ScenarioType,
    distance_km: float = 100.0,
    estimated_time_minutes: int = 120,
    fuel_liters: Optional[float] = None,
) -> dict:
    rule = SCENARIO_RULES[scenario]
    context = build_scenario_context(scenario, distance_km, estimated_time_minutes)
    baseline = _baseline(context, rule, fuel_liters)
    try:
        optimized = deterministic_optimize(context)
    except AppError as exc:
        return {
            "simulated": True,
            "scenario": scenario.value,
            "generatedAt": datetime.now(timezone.utc),
            "optimizerContext": context,
            "baseline": baseline,
            "feasible": False,
            "failure": {"code": exc.code, "message": exc.message},
            "analytics": None,
            "comparison": None,
        }

    analytics = _analytics(baseline, optimized, fuel_liters)
    impossible = rule.get("impossible", False) or analytics["lateDeliveries"] > 0
    return {
        "simulated": True,
        "scenario": scenario.value,
        "generatedAt": datetime.now(timezone.utc),
        "optimizerContext": context,
        "baseline": baseline,
        "optimized": optimized,
        "feasible": not impossible,
        "failure": None,
        "analytics": analytics,
        "comparison": {
            "simulated": True,
            "baseline": {"distanceKm": baseline["distanceKm"], "estimatedTimeMinutes": baseline["estimatedTimeMinutes"]},
            "optimized": {"distanceKm": analytics["totalDistanceKm"], "estimatedTimeMinutes": analytics["estimatedTravelDeliveryTimeMinutes"]},
        },
        "note": "All inputs, baselines, and calculated outcomes in this response are simulated; no real-world performance is claimed.",
    }


def run_scenarios(scenarios: list[ScenarioType], **kwargs) -> dict:
    runs = [run_scenario(scenario, **kwargs) for scenario in scenarios]
    analytics = [run["analytics"] for run in runs if run["analytics"]]
    return {
        "simulated": True,
        "runs": runs,
        "summary": {
            "scenarioCount": len(runs),
            "feasibleScenarioCount": sum(run["feasible"] for run in runs),
            "lateDeliveries": sum(item["lateDeliveries"] for item in analytics),
            "totalDistanceKm": round(sum(item["totalDistanceKm"] for item in analytics), 3),
            "estimatedTravelDeliveryTimeMinutes": sum(item["estimatedTravelDeliveryTimeMinutes"] for item in analytics),
        },
        "note": "Summary aggregates simulated scenario results only; it is not operational fleet analytics.",
    }
