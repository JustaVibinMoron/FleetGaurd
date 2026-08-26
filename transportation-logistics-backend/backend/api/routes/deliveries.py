from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies.auth import get_current_user, require_roles
from backend.database.session import get_db
from backend.models.enums import UserRole
from backend.models.user import User
from backend.schemas.delivery import DeliveryCreate, DeliveryOut, DeliveryStatusUpdate
from backend.services import delivery_service
from backend.utils.responses import success

router = APIRouter()


@router.post("", summary="Create a delivery (Admin / Dispatcher)")
def create_delivery(
    payload: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
):
    delivery = delivery_service.create_delivery(db, payload, current_user)
    return success(DeliveryOut.model_validate(delivery), status_code=201)


@router.get("", summary="List deliveries")
def list_deliveries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deliveries = delivery_service.list_deliveries(db, current_user)
    return success([DeliveryOut.model_validate(item) for item in deliveries])


@router.get("/{delivery_id}", summary="Get one delivery")
def get_delivery(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = delivery_service.get_delivery(db, delivery_id, current_user)
    return success(DeliveryOut.model_validate(delivery))


@router.put("/{delivery_id}/status", summary="Update delivery status")
def update_status(
    delivery_id: int,
    payload: DeliveryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
    ),
):
    delivery = delivery_service.update_delivery_status(db, delivery_id, payload, current_user)
    return success(DeliveryOut.model_validate(delivery))
