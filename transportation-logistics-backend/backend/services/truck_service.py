from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models.enums import UserRole
from backend.models.truck import Truck
from backend.models.user import User
from backend.schemas.truck import TruckCreate, TruckUpdate
from backend.utils.exceptions import AppError


def _ensure_load_within_capacity(max_capacity_kg: float, current_load_kg: float) -> None:
    if current_load_kg > max_capacity_kg:
        raise AppError(
            "LOAD_EXCEEDS_CAPACITY",
            "currentLoadKg cannot be greater than maxCapacityKg",
            422,
        )


def _get_user_or_404(db: Session, user_id: int, field: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User for {0} does not exist".format(field), 404)
    return user


def list_trucks(db: Session, current_user: User):
    query = db.query(Truck)
    if current_user.role == UserRole.DRIVER:
        query = query.filter(Truck.driver_id == current_user.id)
    return query.order_by(Truck.id).all()


def get_truck(db: Session, truck_id: int, current_user: User) -> Truck:
    truck = db.get(Truck, truck_id)
    if truck is None:
        raise AppError("TRUCK_NOT_FOUND", "Truck does not exist", 404)
    if current_user.role == UserRole.DRIVER and truck.driver_id != current_user.id:
        raise AppError("FORBIDDEN", "You can only view your assigned truck", 403)
    return truck


def create_truck(db: Session, payload: TruckCreate, current_user: User) -> Truck:
    _ensure_load_within_capacity(payload.max_capacity_kg, payload.current_load_kg)

    owner_id = payload.owner_id or current_user.id
    _get_user_or_404(db, owner_id, "ownerId")

    if payload.driver_id is not None:
        driver = _get_user_or_404(db, payload.driver_id, "driverId")
        if driver.role != UserRole.DRIVER:
            raise AppError("VALIDATION_ERROR", "driverId must refer to a user with DRIVER role", 422)

    truck = Truck(
        registration_number=payload.registration_number.upper(),
        owner_id=owner_id,
        driver_id=payload.driver_id,
        max_capacity_kg=payload.max_capacity_kg,
        current_load_kg=payload.current_load_kg,
        current_location=payload.current_location,
        status=payload.status,
    )
    db.add(truck)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppError("DUPLICATE_REGISTRATION", "registrationNumber already exists", 409) from exc
    db.refresh(truck)
    return truck


def update_truck(db: Session, truck_id: int, payload: TruckUpdate, current_user: User) -> Truck:
    truck = get_truck(db, truck_id, current_user)
    data = payload.model_dump(exclude_unset=True)

    max_capacity = data.get("max_capacity_kg", truck.max_capacity_kg)
    current_load = data.get("current_load_kg", truck.current_load_kg)
    _ensure_load_within_capacity(max_capacity, current_load)

    if "owner_id" in data:
        _get_user_or_404(db, data["owner_id"], "ownerId")
    if "driver_id" in data and data["driver_id"] is not None:
        driver = _get_user_or_404(db, data["driver_id"], "driverId")
        if driver.role != UserRole.DRIVER:
            raise AppError("VALIDATION_ERROR", "driverId must refer to a user with DRIVER role", 422)
    if "registration_number" in data:
        data["registration_number"] = data["registration_number"].upper()

    for key, value in data.items():
        setattr(truck, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppError("DUPLICATE_REGISTRATION", "registrationNumber already exists", 409) from exc
    db.refresh(truck)
    return truck


def delete_truck(db: Session, truck_id: int, current_user: User) -> None:
    truck = get_truck(db, truck_id, current_user)
    db.delete(truck)
    db.commit()
