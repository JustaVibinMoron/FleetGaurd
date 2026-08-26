from typing import Optional

from pydantic import EmailStr, Field

from backend.models.enums import UserRole
from backend.schemas.common import CamelModel


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    role: Optional[UserRole] = None


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class TokenData(CamelModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
