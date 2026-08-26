from collections.abc import Callable

from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.authentication.jwt import decode_access_token
from backend.database.session import get_db
from backend.models.enums import UserRole
from backend.models.user import User
from backend.utils.exceptions import AppError

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError("UNAUTHORIZED", "Missing or invalid Authorization header", 401)

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise AppError("UNAUTHORIZED", "Invalid or expired token", 401)

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppError("UNAUTHORIZED", "User not found or inactive", 401)
    return user


def require_roles(*allowed: UserRole) -> Callable:
    """Factory used as Depends(require_roles(UserRole.ADMIN, ...))."""

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise AppError(
                "FORBIDDEN",
                f"Role {current_user.role.value} cannot access this resource",
                403,
            )
        return current_user

    return _checker
