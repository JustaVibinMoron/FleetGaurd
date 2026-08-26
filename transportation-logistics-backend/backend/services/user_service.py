from sqlalchemy.orm import Session

from backend.models.user import User
from backend.schemas.user import UserUpdateRequest
from backend.utils.exceptions import AppError


def list_users(db: Session):
    return db.query(User).order_by(User.id).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User does not exist", 404)
    return user


def update_user(db: Session, user_id: int, payload: UserUpdateRequest) -> User:
    user = get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user(db, user_id)
    db.delete(user)
    db.commit()
