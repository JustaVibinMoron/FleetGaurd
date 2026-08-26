from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.models.enums import DeliveryStatus
from backend.schemas.common import CamelModel


class DeliveryCreate(CamelModel):
    origin: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    load_kg: float = Field(gt=0)
    truck_id: Optional[int] = None
    assigned_driver_id: Optional[int] = None
    estimated_delivery_time: Optional[datetime] = None


class DeliveryStatusUpdate(CamelModel):
    delivery_status: DeliveryStatus
    truck_id: Optional[int] = None
    assigned_driver_id: Optional[int] = None


class DeliveryOut(CamelModel):
    id: int = Field(serialization_alias="deliveryId")
    truck_id: Optional[int]
    origin: str
    destination: str
    load_kg: float
    delivery_status: DeliveryStatus
    assigned_driver_id: Optional[int]
    estimated_delivery_time: Optional[datetime]
    created_at: datetime
