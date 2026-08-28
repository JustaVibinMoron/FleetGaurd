"""Configurable weights, penalties, and solver limits for the VRP engine."""

from dataclasses import dataclass


@dataclass(frozen=True)
class OptimizationWeights:
    distance: float = 1.0
    travel_time: float = 1.0
    delay: float = 10.0
    high_priority: float = 100.0
    medium_priority: float = 50.0
    low_priority: float = 10.0
    unassigned: float = 1000.0


@dataclass(frozen=True)
class SolverConfig:
    time_limit_seconds: float = 2.0
    max_delay_minutes: int = 120
    planning_horizon_minutes: int = 24 * 60
    random_seed: int = 42
    assume_speed_kmh: float = 40.0


_PRIORITY_FIELD = {
    "HIGH": "high_priority",
    "MEDIUM": "medium_priority",
    "LOW": "low_priority",
}

_MAX_INT = 2_000_000_000
UNASSIGNED_PENALTY_SCALE = 1_000_000


def priority_weight(priority: str, weights: OptimizationWeights) -> float:
    field = _PRIORITY_FIELD.get(str(priority).upper(), "medium_priority")
    return float(getattr(weights, field))


def drop_penalty(priority: str, weights: OptimizationWeights, max_arc_cost: int, node_count: int) -> int:
    """
    Cost of leaving a delivery unassigned.

    Priority weights stay ordered even when travel costs are large, so a
    HIGH drop is always more expensive than a LOW drop.
    """
    tour_cost = max(int(max_arc_cost), 1) * max(int(node_count), 1)
    ratio = priority_weight(priority, weights) / max(weights.high_priority, 1.0)
    raw = weights.unassigned * ratio * UNASSIGNED_PENALTY_SCALE + tour_cost
    return max(1, min(_MAX_INT, int(round(raw))))


def delay_penalty_per_minute(priority: str, weights: OptimizationWeights) -> int:
    raw = weights.delay * priority_weight(priority, weights)
    return max(1, min(_MAX_INT, int(round(raw))))


def arc_cost(distance_km: float, duration_min: float, weights: OptimizationWeights) -> int:
    distance_term = weights.distance * float(distance_km) * 1000.0
    time_term = weights.travel_time * float(duration_min) * 60.0
    return max(0, min(_MAX_INT, int(round(distance_term + time_term))))
