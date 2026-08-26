from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from backend.models.enums import UserRole
from backend.schemas.common import CamelModel


class UserOut(CamelModel):
    id: int = Field(serialization_alias="userId")
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdateRequest(CamelModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
