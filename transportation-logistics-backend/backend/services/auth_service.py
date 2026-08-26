from sqlalchemy.orm import Session

from backend.authentication.jwt import create_access_token
from backend.authentication.security import hash_password, verify_password
from backend.models.enums import UserRole
from backend.models.user import User
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenData
from backend.utils.exceptions import AppError


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise AppError("EMAIL_ALREADY_EXISTS", "An account with this email already exists", 409)

    user_count = db.query(User).count()
    if user_count == 0:
        role = UserRole.ADMIN
    else:
        if payload.role == UserRole.ADMIN:
            raise AppError("FORBIDDEN", "Only an existing admin can create another admin", 403)
        role = payload.role or UserRole.DRIVER

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, payload: LoginRequest) -> TokenData:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise AppError("INVALID_CREDENTIALS", "Email or password is incorrect", 401)
    if not user.is_active:
        raise AppError("UNAUTHORIZED", "User account is inactive", 401)

    token = create_access_token(subject=str(user.id), extra={"role": user.role.value})
    return TokenData(access_token=token, role=user.role, user_id=user.id)
