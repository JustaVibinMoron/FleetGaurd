"""Optimizer input/output structures. These are not database models."""

from enum import Enum
from typing import Any, Optional, Union

from pydantic import Field, model_validator

from backend.optimizer.objectives import OptimizationWeights, SolverConfig
from backend.schemas.common import CamelModel


class DeliveryPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class GeoPoint(CamelModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class TimeWindow(CamelModel):
    start: str
    end: str


class VehicleInput(CamelModel):
    id: Union[int, str]
    capacity_kg: float = Field(gt=0)
    current_load_kg: float = Field(default=0, ge=0)
    current_location: GeoPoint
    available: bool = True

    @model_validator(mode="before")
    @classmethod
    def _normalize_capacity_keys(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        payload = dict(data)
        if "capacityKg" not in payload and "capacity_kg" not in payload:
            if "maxCapacityKg" in payload:
                payload["capacityKg"] = payload["maxCapacityKg"]
            elif "max_capacity_kg" in payload:
                payload["capacity_kg"] = payload["max_capacity_kg"]
        return payload

    @property
    def available_capacity_kg(self) -> float:
        return max(0.0, float(self.capacity_kg) - float(self.current_load_kg))


class DeliveryInput(CamelModel):
    id: Union[int, str]
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    load_kg: float = Field(gt=0)
    priority: DeliveryPriority = DeliveryPriority.MEDIUM
    time_window: Optional[TimeWindow] = None
    service_time_minutes: int = Field(default=0, ge=0)


class TravelMatrix(CamelModel):
    distance_km: list[list[float]]
    duration_minutes: list[list[float]]


class OptimizationRequest(CamelModel):
    vehicles: list[VehicleInput] = Field(default_factory=list)
    deliveries: list[DeliveryInput] = Field(default_factory=list)
    travel_matrix: Optional[TravelMatrix] = None
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)
    solver: SolverConfig = Field(default_factory=SolverConfig)
    fetch_geometry: bool = False
    shift_start: str = "00:00"


class UnassignedDelivery(CamelModel):
    delivery_id: Union[int, str]
    reason: str


class OptimizedRoute(CamelModel):
    vehicle_id: Union[int, str]
    delivery_ids: list[Union[int, str]]
    distance_km: float
    estimated_time_minutes: float
    load_kg: float = 0
    geometry: Optional[dict[str, Any]] = None


class OptimizationMetrics(CamelModel):
    total_distance_km: float
    total_time_minutes: float
    delayed_deliveries: int
    priority_deliveries_completed: int
    vehicle_utilization: float
    assigned_deliveries: int = 0
    unassigned_count: int = 0


class OptimizedPlan(CamelModel):
    routes: list[OptimizedRoute]
    metrics: OptimizationMetrics
    unassigned_deliveries: list[UnassignedDelivery]
