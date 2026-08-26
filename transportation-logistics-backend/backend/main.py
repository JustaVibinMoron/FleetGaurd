from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from backend.api.router import api_router
from backend.config.settings import get_settings
from backend.database.base import Base
from backend.database.session import engine
from backend.models import (  # noqa: F401
    Delivery,
    Route,
    RouteOptimizationResult,
    Truck,
    User,
)
from backend.utils.exceptions import AppError

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    description=(
        "REST backend for truck logistics, deliveries, routes, "
        "and pluggable AI / optimizer modules. "
        "Authenticate with JWT: click Authorize and paste `Bearer <token>`."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body or query failed validation",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_handler(_: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Response or payload validation failed",
                "details": exc.errors(),
            },
        },
    )


app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", tags=["Health"])
def root():
    return {
        "success": True,
        "data": {
            "service": settings.app_name,
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
