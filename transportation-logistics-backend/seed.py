"""Seed the database with a known admin account for development/demo.

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

from backend.config.settings import get_settings
from backend.database.base import Base
from backend.database.session import engine, SessionLocal
from backend.database.seeder import (
    seed_if_empty,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
)


def seed() -> None:
    settings = get_settings()
    print(f"Database URL: {settings.database_url}")

    # Create tables if they don't already exist.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_if_empty(db)
        print(f"[OK] Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
