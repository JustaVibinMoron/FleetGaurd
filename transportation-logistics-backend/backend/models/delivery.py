"""
Delivery table.

A delivery may be assigned to one truck and one driver.
Each delivery is expected to have at most one Route (one-to-one).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base
from backend.models.enums import DeliveryStatus


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    truck_id: Mapped[Optional[int]] = mapped_column(ForeignKey("trucks.id"), nullable=True, index=True)
    origin: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    load_kg: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="delivery_status", native_enum=False),
        nullable=False,
        default=DeliveryStatus.PENDING,
    )
    assigned_driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    estimated_delivery_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    truck = relationship("Truck", back_populates="deliveries")
    assigned_driver = relationship(
        "User",
        back_populates="assigned_deliveries",
        foreign_keys=[assigned_driver_id],
    )
    route = relationship("Route", back_populates="delivery", uselist=False)
