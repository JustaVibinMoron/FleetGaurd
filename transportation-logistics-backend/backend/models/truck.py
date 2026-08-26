"""
Truck table.

A truck belongs to one owner (User) and may be assigned one driver.
Capacity is stored in kilograms so we can reject invalid load assignments.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base
from backend.models.enums import TruckStatus


class Truck(Base):
    __tablename__ = "trucks"
    __table_args__ = (
        CheckConstraint("current_load_kg >= 0", name="ck_truck_current_load_non_negative"),
        CheckConstraint("max_capacity_kg > 0", name="ck_truck_max_capacity_positive"),
        CheckConstraint(
            "current_load_kg <= max_capacity_kg",
            name="ck_truck_load_within_capacity",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    registration_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    driver_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    max_capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    current_load_kg: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    current_location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[TruckStatus] = mapped_column(
        Enum(TruckStatus, name="truck_status", native_enum=False),
        nullable=False,
        default=TruckStatus.AVAILABLE,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    owner = relationship("User", back_populates="owned_trucks", foreign_keys=[owner_id])
    driver = relationship("User", back_populates="driven_trucks", foreign_keys=[driver_id])
    deliveries = relationship("Delivery", back_populates="truck")
