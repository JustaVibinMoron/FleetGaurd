"""
SQLAlchemy declarative base.

All database models inherit from Base so they share the same metadata
and can be created together with Base.metadata.create_all().
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
