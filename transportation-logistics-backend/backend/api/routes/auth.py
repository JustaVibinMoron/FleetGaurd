from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies.auth import get_current_user
from backend.database.session import get_db
from backend.models.user import User
from backend.schemas.auth import LoginRequest, RegisterRequest
from backend.schemas.user import UserOut
from backend.services.auth_service import login_user, register_user
from backend.utils.responses import success

router = APIRouter()


@router.post("/register", summary="Create an account")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, payload)
    return success(UserOut.model_validate(user), status_code=201)


@router.post("/login", summary="Exchange email/password for a JWT")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    token = login_user(db, payload)
    return success(token)


@router.get("/me", summary="Current user profile")
def me(current_user: User = Depends(get_current_user)):
    return success(UserOut.model_validate(current_user))
