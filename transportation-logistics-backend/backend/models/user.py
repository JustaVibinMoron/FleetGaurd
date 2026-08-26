"""
User table.

One user can own many trucks (owner_id on Truck) and can be assigned as
a driver on trucks and deliveries.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base
from backend.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        default=UserRole.DRIVER,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owned_trucks = relationship(
        "Truck",
        back_populates="owner",
        foreign_keys="Truck.owner_id",
    )
    driven_trucks = relationship(
        "Truck",
        back_populates="driver",
        foreign_keys="Truck.driver_id",
    )
    assigned_deliveries = relationship(
        "Delivery",
        back_populates="assigned_driver",
        foreign_keys="Delivery.assigned_driver_id",
    )
