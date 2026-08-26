from fastapi import APIRouter, Depends

from backend.api.dependencies.auth import require_roles
from backend.models.enums import UserRole
from backend.schemas.simulation import ScenarioBatchRequest, ScenarioRunRequest
from backend.services.simulation_service import run_scenario, run_scenarios
from backend.utils.responses import success

router = APIRouter()


@router.post("/run", summary="Run a simulated disruption scenario")
def run(payload: ScenarioRunRequest, _=Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER))):
    return success(run_scenario(**payload.model_dump()))


@router.post("/run-batch", summary="Compare simulated baseline and optimized scenarios")
def run_batch(payload: ScenarioBatchRequest, _=Depends(require_roles(UserRole.ADMIN, UserRole.DISPATCHER))):
    return success(run_scenarios(**payload.model_dump()))
