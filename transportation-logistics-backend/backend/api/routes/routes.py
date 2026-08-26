from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies.auth import get_current_user, require_roles
from backend.database.session import get_db
from backend.models.enums import UserRole
from backend.models.user import User
from backend.schemas.route import RouteCreate, RouteOptimizeRequest, RouteUpdate
from backend.services import route_service
from backend.utils.responses import success

router = APIRouter()


@router.get("", summary="List routes")
def list_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    routes = route_service.list_routes(db, current_user)
    return success([route_service.build_route_payload(route) for route in routes])


@router.get("/{route_id}", summary="Get one route")
def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    route = route_service.get_route(db, route_id, current_user)
    return success(route_service.build_route_payload(route))


@router.post("", summary="Create a route (Admin / Dispatcher)")
def create_route(
    payload: RouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
):
    route = route_service.create_route(db, payload, current_user)
    return success(route_service.build_route_payload(route), status_code=201)


@router.put("/{route_id}", summary="Update a route (Admin / Dispatcher)")
def update_route(
    route_id: int,
    payload: RouteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
):
    route = route_service.update_route(db, route_id, payload, current_user)
    return success(route_service.build_route_payload(route))


@router.post("/{route_id}/optimize", summary="Run AI + optimizer for a route")
def optimize_route(
    route_id: int,
    payload: Optional[RouteOptimizeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER)),
):
    result = route_service.optimize_route(
        db,
        route_id,
        payload or RouteOptimizeRequest(),
        current_user,
    )
    return success(result)
