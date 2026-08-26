from fastapi import APIRouter

from backend.utils.responses import success

router = APIRouter()


@router.get("/health", summary="Liveness check (no auth)")
def health():
    return success({"status": "ok"})
