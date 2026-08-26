from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies.auth import get_current_user, require_roles
from backend.database.session import get_db
from backend.models.enums import UserRole
from backend.models.user import User
from backend.schemas.truck import TruckCreate, TruckOut, TruckUpdate
from backend.services import truck_service
from backend.utils.responses import success

router = APIRouter()


@router.get("", summary="List trucks")
def list_trucks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trucks = truck_service.list_trucks(db, current_user)
    return success([TruckOut.model_validate(truck) for truck in trucks])


@router.get("/{truck_id}", summary="Get one truck")
def get_truck(
    truck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    truck = truck_service.get_truck(db, truck_id, current_user)
    return success(TruckOut.model_validate(truck))


@router.post("", summary="Create a truck (Admin)")
def create_truck(
    payload: TruckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    truck = truck_service.create_truck(db, payload, current_user)
    return success(TruckOut.model_validate(truck), status_code=201)


@router.put("/{truck_id}", summary="Update a truck (Admin / Dispatcher)")
def update_truck(
    truck_id: int,
    payload: TruckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
):
    truck = truck_service.update_truck(db, truck_id, payload, current_user)
    return success(TruckOut.model_validate(truck))


@router.delete("/{truck_id}", summary="Delete a truck (Admin)")
def delete_truck(
    truck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    truck_service.delete_truck(db, truck_id, current_user)
    return success({"deleted": True, "truckId": truck_id})
