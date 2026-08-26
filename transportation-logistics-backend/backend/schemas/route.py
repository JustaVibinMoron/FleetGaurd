from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.models.enums import RouteStatus
from backend.schemas.common import CamelModel


class RouteCreate(CamelModel):
    delivery_id: int
    start_location: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    distance_km: float = Field(gt=0)
    estimated_time_minutes: int = Field(gt=0)
    route_status: RouteStatus = RouteStatus.ACTIVE


class RouteUpdate(CamelModel):
    start_location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    destination: Optional[str] = Field(default=None, min_length=1, max_length=255)
    distance_km: Optional[float] = Field(default=None, gt=0)
    estimated_time_minutes: Optional[int] = Field(default=None, gt=0)
    route_status: Optional[RouteStatus] = None


class RouteOptimizeRequest(CamelModel):
    problem: Optional[str] = Field(default=None, max_length=1000)
    delivery_priority: Optional[str] = Field(default="normal", max_length=32)


class RouteCalculateRequest(CamelModel):
    start_latitude: float = Field(ge=-90, le=90)
    start_longitude: float = Field(ge=-180, le=180)
    destination_latitude: float = Field(ge=-90, le=90)
    destination_longitude: float = Field(ge=-180, le=180)


class OptimizationResultOut(CamelModel):
    id: int = Field(serialization_alias="resultId")
    route_id: int
    source: str
    recommended_route: str
    estimated_time: int
    fuel_saving: Optional[float]
    reason: str
    created_at: datetime


class RouteOut(CamelModel):
    id: int = Field(serialization_alias="routeId")
    delivery_id: int
    start_location: str
    destination: str
    distance_km: float
    estimated_time_minutes: int
    route_status: RouteStatus
    created_at: datetime
    latest_optimization: Optional[OptimizationResultOut] = None
