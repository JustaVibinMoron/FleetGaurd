from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.models.enums import TruckStatus
from backend.schemas.common import CamelModel


class TruckCreate(CamelModel):
    registration_number: str = Field(min_length=3, max_length=64)
    owner_id: Optional[int] = None
    driver_id: Optional[int] = None
    max_capacity_kg: float = Field(gt=0)
    current_load_kg: float = Field(default=0, ge=0)
    current_location: str = Field(min_length=1, max_length=255)
    status: TruckStatus = TruckStatus.AVAILABLE


class TruckUpdate(CamelModel):
    registration_number: Optional[str] = Field(default=None, min_length=3, max_length=64)
    owner_id: Optional[int] = None
    driver_id: Optional[int] = None
    max_capacity_kg: Optional[float] = Field(default=None, gt=0)
    current_load_kg: Optional[float] = Field(default=None, ge=0)
    current_location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[TruckStatus] = None


class TruckOut(CamelModel):
    id: int = Field(serialization_alias="truckId")
    registration_number: str
    owner_id: int
    driver_id: Optional[int]
    max_capacity_kg: float
    current_load_kg: float
    current_location: str
    status: TruckStatus
    created_at: datetime
    updated_at: datetime
