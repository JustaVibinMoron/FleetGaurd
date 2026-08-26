from fastapi import APIRouter

from backend.api.routes import auth, deliveries, health, osrm, routes, trucks, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(trucks.router, prefix="/trucks", tags=["Trucks"])
api_router.include_router(deliveries.router, prefix="/deliveries", tags=["Deliveries"])
# Register /calculate before /{route_id} so the path is not treated as an id.
api_router.include_router(osrm.router, prefix="/routes", tags=["Routes"])
api_router.include_router(routes.router, prefix="/routes", tags=["Routes"])
