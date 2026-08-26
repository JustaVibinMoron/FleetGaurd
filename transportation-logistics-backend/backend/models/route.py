"""
Route table.

One delivery has one route (enforced with a unique delivery_id).
A route can have many optimization attempts stored in RouteOptimizationResult.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base
from backend.models.enums import RouteStatus


class Route(Base):
    __tablename__ = "routes"
    __table_args__ = (UniqueConstraint("delivery_id", name="uq_routes_delivery_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    delivery_id: Mapped[int] = mapped_column(ForeignKey("deliveries.id"), nullable=False, index=True)
    start_location: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    route_status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus, name="route_status", native_enum=False),
        nullable=False,
        default=RouteStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    delivery = relationship("Delivery", back_populates="route")
    optimizations = relationship(
        "RouteOptimizationResult",
        back_populates="route",
        cascade="all, delete-orphan",
    )
