"""
Database engine and session factory.

This layer is the only place that talks to PostgreSQL connection details.
Route handlers ask for a Session via FastAPI Depends() instead of opening
connections themselves.
"""

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config.settings import get_settings

settings = get_settings()

# Ensure the parent directory for SQLite files exists.
if settings.database_url.startswith("sqlite"):
    # Extract path from "sqlite:///./data/tlms.db" → "./data/tlms.db"
    _db_path = settings.database_url.split("///", 1)[-1]
    _db_dir = os.path.dirname(_db_path)
    if _db_dir:
        os.makedirs(_db_dir, exist_ok=True)

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
