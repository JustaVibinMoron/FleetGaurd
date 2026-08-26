from enum import Enum
from typing import Optional

from pydantic import Field

from backend.schemas.common import CamelModel


class ScenarioType(str, Enum):
    NORMAL = "normal"
    HEAVY_TRAFFIC = "heavy_traffic"
    ROAD_CLOSURE = "road_closure"
    VEHICLE_BREAKDOWN = "vehicle_breakdown"
    URGENT_DELIVERY = "urgent_delivery"
    OVERLOADED_VEHICLE = "overloaded_vehicle"
    IMPOSSIBLE_OVERDUE_DELIVERY = "impossible_overdue_delivery"


class ScenarioRunRequest(CamelModel):
    scenario: ScenarioType
    distance_km: float = Field(default=100.0, gt=0)
    estimated_time_minutes: int = Field(default=120, gt=0)
    fuel_liters: Optional[float] = Field(default=None, gt=0)


class ScenarioBatchRequest(CamelModel):
    scenarios: list[ScenarioType] = Field(default_factory=lambda: list(ScenarioType))
    distance_km: float = Field(default=100.0, gt=0)
    estimated_time_minutes: int = Field(default=120, gt=0)
    fuel_liters: Optional[float] = Field(default=None, gt=0)
