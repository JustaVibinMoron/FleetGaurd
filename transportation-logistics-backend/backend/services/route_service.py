import json
from typing import Optional

from sqlalchemy.orm import Session

from backend.ai.ai_service import request_ai_recommendation
from backend.models.delivery import Delivery
from backend.models.enums import RouteStatus, UserRole
from backend.models.optimization import RouteOptimizationResult
from backend.models.route import Route
from backend.models.truck import Truck
from backend.models.user import User
from backend.optimizer.optimizer_service import request_optimizer_plan
from backend.schemas.route import RouteCreate, RouteOptimizeRequest, RouteUpdate
from backend.utils.exceptions import AppError


def list_routes(db: Session, current_user: User):
    query = db.query(Route)
    if current_user.role == UserRole.DRIVER:
        query = query.join(Delivery).filter(Delivery.assigned_driver_id == current_user.id)
    return query.order_by(Route.id).all()


def get_route(db: Session, route_id: int, current_user: User) -> Route:
    route = db.get(Route, route_id)
    if route is None:
        raise AppError("ROUTE_NOT_FOUND", "Route does not exist", 404)
    if current_user.role == UserRole.DRIVER:
        delivery = db.get(Delivery, route.delivery_id)
        if delivery is None or delivery.assigned_driver_id != current_user.id:
            raise AppError("FORBIDDEN", "You can only view routes for your deliveries", 403)
    return route


def create_route(db: Session, payload: RouteCreate, current_user: User) -> Route:
    delivery = db.get(Delivery, payload.delivery_id)
    if delivery is None:
        raise AppError("DELIVERY_NOT_FOUND", "Delivery does not exist", 404)

    existing = db.query(Route).filter(Route.delivery_id == payload.delivery_id).first()
    if existing:
        raise AppError("ROUTE_ALREADY_EXISTS", "This delivery already has a route", 409)

    route = Route(
        delivery_id=payload.delivery_id,
        start_location=payload.start_location,
        destination=payload.destination,
        distance_km=payload.distance_km,
        estimated_time_minutes=payload.estimated_time_minutes,
        route_status=payload.route_status,
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def update_route(db: Session, route_id: int, payload: RouteUpdate, current_user: User) -> Route:
    route = get_route(db, route_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(route, key, value)
    db.commit()
    db.refresh(route)
    return route


def _latest_result(route: Route) -> Optional[RouteOptimizationResult]:
    if not route.optimizations:
        return None
    return sorted(route.optimizations, key=lambda item: item.id, reverse=True)[0]


def build_route_payload(route: Route) -> dict:
    latest = _latest_result(route)
    return {
        "routeId": route.id,
        "deliveryId": route.delivery_id,
        "startLocation": route.start_location,
        "destination": route.destination,
        "distanceKm": route.distance_km,
        "estimatedTimeMinutes": route.estimated_time_minutes,
        "routeStatus": route.route_status.value,
        "createdAt": route.created_at,
        "latestOptimization": None
        if latest is None
        else {
            "resultId": latest.id,
            "routeId": latest.route_id,
            "source": latest.source,
            "recommendedRoute": latest.recommended_route,
            "estimatedTime": latest.estimated_time,
            "fuelSaving": latest.fuel_saving,
            "reason": latest.reason,
            "createdAt": latest.created_at,
        },
    }


def optimize_route(
    db: Session,
    route_id: int,
    payload: RouteOptimizeRequest,
    current_user: User,
) -> dict:
    route = get_route(db, route_id, current_user)
    delivery = db.get(Delivery, route.delivery_id)
    if delivery is None:
        raise AppError("DELIVERY_NOT_FOUND", "Delivery for this route does not exist", 404)

    truck = None
    if delivery.truck_id is not None:
        truck = db.get(Truck, delivery.truck_id)

    context = {
        "origin": route.start_location,
        "destination": route.destination,
        "truckCapacityKg": truck.max_capacity_kg if truck else None,
        "currentLoadKg": truck.current_load_kg if truck else delivery.load_kg,
        "problem": payload.problem or route.route_status.value,
        "deliveryPriority": payload.delivery_priority,
        "deliveryId": delivery.id,
        "routeId": route.id,
        "distanceKm": route.distance_km,
        "estimatedTimeMinutes": route.estimated_time_minutes,
        "currentRouteStatus": route.route_status.value,
    }

    optimizer_result = request_optimizer_plan(context)
    ai_result = request_ai_recommendation(context)

    stored = []
    for source, result in (("optimizer", optimizer_result), ("ai", ai_result)):
        row = RouteOptimizationResult(
            route_id=route.id,
            source=source,
            recommended_route=str(result["recommendedRoute"]),
            estimated_time=int(result["estimatedTime"]),
            fuel_saving=result.get("fuelSaving"),
            reason=str(result["reason"]),
            raw_response=json.dumps(result),
        )
        db.add(row)
        stored.append(row)

    if route.route_status in {RouteStatus.BLOCKED, RouteStatus.DELAYED, RouteStatus.ACTIVE}:
        route.route_status = RouteStatus.ALTERNATIVE
        route.estimated_time_minutes = int(ai_result["estimatedTime"])

    db.commit()
    for row in stored:
        db.refresh(row)

    return {
        "contextSent": context,
        "optimizer": optimizer_result,
        "ai": ai_result,
        "storedResultIds": [row.id for row in stored],
        "updatedRoute": build_route_payload(route),
    }
