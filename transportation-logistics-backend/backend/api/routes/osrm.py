from fastapi import APIRouter, Depends

from backend.api.dependencies.auth import get_current_user
from backend.maps.osrm_client import get_route
from backend.models.user import User
from backend.schemas.route import RouteCalculateRequest
from backend.utils.responses import success

router = APIRouter()


@router.post("/calculate", summary="Calculate a driving route via OSRM")
def calculate_route(
    payload: RouteCalculateRequest,
    _: User = Depends(get_current_user),
):
    """
    Frontend: POST /api/routes/calculate

    {
      "startLatitude": 28.6139,
      "startLongitude": 77.2090,
      "destinationLatitude": 19.0760,
      "destinationLongitude": 72.8777
    }
    """
    result = get_route(
        start_lon=payload.start_longitude,
        start_lat=payload.start_latitude,
        end_lon=payload.destination_longitude,
        end_lat=payload.destination_latitude,
    )
    return success(result)
