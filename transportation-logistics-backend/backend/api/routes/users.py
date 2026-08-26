from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies.auth import require_roles
from backend.database.session import get_db
from backend.models.enums import UserRole
from backend.models.user import User
from backend.schemas.user import UserOut, UserUpdateRequest
from backend.services import user_service
from backend.utils.responses import success

router = APIRouter()


@router.get("", summary="List users (Admin)")
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    users = user_service.list_users(db)
    return success([UserOut.model_validate(user) for user in users])


@router.get("/{user_id}", summary="Get one user (Admin)")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user = user_service.get_user(db, user_id)
    return success(UserOut.model_validate(user))


@router.put("/{user_id}", summary="Update user role/name (Admin)")
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user = user_service.update_user(db, user_id, payload)
    return success(UserOut.model_validate(user))


@router.delete("/{user_id}", summary="Delete a user (Admin)")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    user_service.delete_user(db, user_id)
    return success({"deleted": True, "userId": user_id})
