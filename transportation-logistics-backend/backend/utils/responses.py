"""Helpers that wrap payloads in the standard success JSON envelope."""

from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel


def success(data: Any, status_code: int = 200) -> JSONResponse:
    if isinstance(data, BaseModel):
        payload = data.model_dump(by_alias=True)
    elif isinstance(data, list):
        payload = [
            item.model_dump(by_alias=True) if isinstance(item, BaseModel) else item
            for item in data
        ]
    else:
        payload = data

    return JSONResponse(
        status_code=status_code,
        content={"success": True, "data": jsonable_encoder(payload)},
    )
