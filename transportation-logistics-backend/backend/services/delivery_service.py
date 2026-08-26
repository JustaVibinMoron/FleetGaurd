from sqlalchemy.orm import Session

from backend.models.delivery import Delivery
from backend.models.enums import DeliveryStatus, TruckStatus, UserRole
from backend.models.truck import Truck
from backend.models.user import User
from backend.schemas.delivery import DeliveryCreate, DeliveryStatusUpdate
from backend.utils.exceptions import AppError

ALLOWED_TRANSITIONS = {
    DeliveryStatus.PENDING: {DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED},
    DeliveryStatus.ASSIGNED: {DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED},
    DeliveryStatus.PICKED_UP: {DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED},
    DeliveryStatus.IN_TRANSIT: {DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED},
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.CANCELLED: set(),
}


def _get_truck(db: Session, truck_id: int) -> Truck:
    truck = db.get(Truck, truck_id)
    if truck is None:
        raise AppError("TRUCK_NOT_FOUND", "Truck does not exist", 404)
    return truck


def _apply_load(truck: Truck, extra_kg: float) -> None:
    new_load = truck.current_load_kg + extra_kg
    if new_load > truck.max_capacity_kg:
        raise AppError(
            "LOAD_EXCEEDS_CAPACITY",
            "Assigning this delivery would exceed the truck's maxCapacityKg",
            422,
        )
    if new_load < 0:
        new_load = 0
    truck.current_load_kg = new_load


def list_deliveries(db: Session, current_user: User):
    query = db.query(Delivery)
    if current_user.role == UserRole.DRIVER:
        query = query.filter(Delivery.assigned_driver_id == current_user.id)
    return query.order_by(Delivery.id).all()


def get_delivery(db: Session, delivery_id: int, current_user: User) -> Delivery:
    delivery = db.get(Delivery, delivery_id)
    if delivery is None:
        raise AppError("DELIVERY_NOT_FOUND", "Delivery does not exist", 404)
    if current_user.role == UserRole.DRIVER and delivery.assigned_driver_id != current_user.id:
        raise AppError("FORBIDDEN", "You can only view your assigned deliveries", 403)
    return delivery


def create_delivery(db: Session, payload: DeliveryCreate, current_user: User) -> Delivery:
    status = DeliveryStatus.PENDING
    truck = None

    if payload.truck_id is not None:
        truck = _get_truck(db, payload.truck_id)
        _apply_load(truck, payload.load_kg)
        if truck.status == TruckStatus.AVAILABLE:
            truck.status = TruckStatus.ASSIGNED
        status = DeliveryStatus.ASSIGNED

    driver_id = payload.assigned_driver_id
    if driver_id is None and truck is not None:
        driver_id = truck.driver_id

    if driver_id is not None:
        driver = db.get(User, driver_id)
        if driver is None or driver.role != UserRole.DRIVER:
            raise AppError("VALIDATION_ERROR", "assignedDriverId must be a DRIVER user", 422)

    delivery = Delivery(
        truck_id=payload.truck_id,
        origin=payload.origin,
        destination=payload.destination,
        load_kg=payload.load_kg,
        delivery_status=status,
        assigned_driver_id=driver_id,
        estimated_delivery_time=payload.estimated_delivery_time,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery


def update_delivery_status(
    db: Session,
    delivery_id: int,
    payload: DeliveryStatusUpdate,
    current_user: User,
) -> Delivery:
    delivery = get_delivery(db, delivery_id, current_user)

    if current_user.role == UserRole.DRIVER:
        allowed_driver_statuses = {
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.DELIVERED,
        }
        if payload.delivery_status not in allowed_driver_statuses:
            raise AppError("FORBIDDEN", "Drivers can only update pickup/transit/delivered status", 403)

    new_status = payload.delivery_status
    if new_status != delivery.delivery_status:
        allowed = ALLOWED_TRANSITIONS[delivery.delivery_status]
        if new_status not in allowed:
            raise AppError(
                "INVALID_STATUS_TRANSITION",
                "Cannot change status from {0} to {1}".format(
                    delivery.delivery_status.value, new_status.value
                ),
                422,
            )

    if payload.truck_id is not None and delivery.truck_id is None:
        truck = _get_truck(db, payload.truck_id)
        _apply_load(truck, delivery.load_kg)
        if truck.status == TruckStatus.AVAILABLE:
            truck.status = TruckStatus.ASSIGNED
        delivery.truck_id = truck.id
        if payload.assigned_driver_id is None and truck.driver_id:
            delivery.assigned_driver_id = truck.driver_id

    if payload.assigned_driver_id is not None:
        driver = db.get(User, payload.assigned_driver_id)
        if driver is None or driver.role != UserRole.DRIVER:
            raise AppError("VALIDATION_ERROR", "assignedDriverId must be a DRIVER user", 422)
        delivery.assigned_driver_id = payload.assigned_driver_id

    previous = delivery.delivery_status
    delivery.delivery_status = new_status

    if delivery.truck_id is not None:
        truck = _get_truck(db, delivery.truck_id)
        if new_status == DeliveryStatus.IN_TRANSIT:
            truck.status = TruckStatus.IN_TRANSIT
        elif new_status == DeliveryStatus.DELIVERED:
            _apply_load(truck, -delivery.load_kg)
            remaining = (
                db.query(Delivery)
                .filter(
                    Delivery.truck_id == truck.id,
                    Delivery.id != delivery.id,
                    Delivery.delivery_status.in_(
                        [
                            DeliveryStatus.ASSIGNED,
                            DeliveryStatus.PICKED_UP,
                            DeliveryStatus.IN_TRANSIT,
                        ]
                    ),
                )
                .count()
            )
            truck.status = TruckStatus.IN_TRANSIT if remaining else TruckStatus.AVAILABLE
        elif new_status == DeliveryStatus.CANCELLED and previous != DeliveryStatus.PENDING:
            if previous in {
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.IN_TRANSIT,
            }:
                _apply_load(truck, -delivery.load_kg)

    db.commit()
    db.refresh(delivery)
    return delivery
