"""
Stored output of an AI or optimizer run.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class RouteOptimizationResult(Base):
    __tablename__ = "route_optimization_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    recommended_route: Mapped[str] = mapped_column(String(512), nullable=False)
    estimated_time: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_saving: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    raw_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    route = relationship("Route", back_populates="optimizations")
