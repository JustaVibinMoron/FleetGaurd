"""
Seed the database with a known admin account and demo trucks.

Called automatically on first startup when the database is empty.
Can also be run standalone via ``python -m seed`` (which imports this).
"""

import bcrypt
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.truck import Truck
from backend.models.enums import UserRole, TruckStatus


# ---- Configuration --------------------------------------------------------

ADMIN_EMAIL = "admin@fleetguard.com"
ADMIN_PASSWORD = "Admin@12345"
ADMIN_FULL_NAME = "Admin User"

SEED_TRUCKS = [
    {"reg": "MH-12-AB-1010", "capacity": 10000, "location": "Kolkata"},
    {"reg": "MH-12-AB-1020", "capacity": 12000, "location": "Bhubaneswar"},
    {"reg": "MH-12-AB-1030", "capacity": 8000, "location": "Kolkata"},
    {"reg": "MH-12-AB-1040", "capacity": 15000, "location": "Cuttack"},
    {"reg": "MH-12-AB-1050", "capacity": 10000, "location": "Ranchi"},
]


def hash_password(plain: str) -> str:
    """Hash a password using bcrypt directly."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def seed_if_empty(db: Session) -> None:
    """Insert admin user and demo trucks only if the database is empty."""
    # Only seed if no users exist yet.
    if db.query(User).count() > 0:
        return

    # --- Admin user ---
    user = User(
        email=ADMIN_EMAIL.lower(),
        hashed_password=hash_password(ADMIN_PASSWORD),
        full_name=ADMIN_FULL_NAME,
        role=UserRole.ADMIN,
    )
    db.add(user)
    db.flush()  # get user.id before inserting trucks

    # --- Demo trucks ---
    for t in SEED_TRUCKS:
        truck = Truck(
            registration_number=t["reg"],
            owner_id=user.id,
            max_capacity_kg=t["capacity"],
            current_load_kg=0,
            current_location=t["location"],
            status=TruckStatus.AVAILABLE,
        )
        db.add(truck)

    db.commit()
