"""Password hashing. Never store plain-text passwords."""

import bcrypt as _bcrypt


def hash_password(plain_password: str) -> str:
    return _bcrypt.hashpw(plain_password.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
