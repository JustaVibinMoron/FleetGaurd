"""
Seed the database with a known admin account for development/demo.

Usage:
    cd transportation-logistics-backend
    python -m seed

This does NOT weaken JWT authentication or modify any backend logic.
It only inserts a user row into the SQLite database.
"""

import sys
import os

# Ensure the project root is on the path so backend.* imports resolve.
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from backend.config.settings import get_settings
from backend.database.base import Base
from backend.database.session import engine, SessionLocal
from backend.models.user import User
from backend.models.truck import Truck
from backend.models.enums import UserRole, TruckStatus


def hash_password(plain: str) -> str:
    """Hash a password using bcrypt directly.
    Works around passlib incompatibility with bcrypt >= 4.1."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

# ---- Configuration --------------------------------------------------------

ADMIN_EMAIL = "admin@fleetguard.com"
ADMIN_PASSWORD = "Admin@12345"
ADMIN_FULL_NAME = "Admin User"

SEED_TRUCKS = [
    {"reg": "MH-12-AB-1010", "capacity": 10000, "location": "Kolkata"},
    {"reg": "MH-12-AB-1020", "capacity": 12000, "location": "Bhubaneswar"},
    {"reg": "MH-12-AB-1030", "capacity": 8000,  "location": "Kolkata"},
    {"reg": "MH-12-AB-1040", "capacity": 15000, "location": "Cuttack"},
    {"reg": "MH-12-AB-1050", "capacity": 10000, "location": "Ranchi"},
]

# ---------------------------------------------------------------------------


def seed() -> None:
    settings = get_settings()
    print(f"Database URL: {settings.database_url}")

    # Create tables if they don't already exist.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # --- Admin user ---
        existing = db.query(User).filter(User.email == ADMIN_EMAIL.lower()).first()
        if existing:
            print(f"[OK] User '{ADMIN_EMAIL}' already exists (id={existing.id}).")
            user = existing
        else:
            user = User(
                email=ADMIN_EMAIL.lower(),
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_FULL_NAME,
                role=UserRole.ADMIN,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[OK] Created admin user: {ADMIN_EMAIL}  (id={user.id})")
            print(f"   Password: {ADMIN_PASSWORD}")

        # --- Trucks ---
        existing_count = db.query(Truck).count()
        if existing_count == 0:
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
            print(f"[OK] Seeded {len(SEED_TRUCKS)} trucks.")
        else:
            print(f"[OK] {existing_count} trucks already exist. Skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
