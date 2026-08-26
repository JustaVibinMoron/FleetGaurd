"""
Pydantic schemas (request/response shapes).
"""

from typing import Any, Optional, Union

from pydantic import BaseModel, ConfigDict


def to_camel(field_name: str) -> str:
    parts = field_name.split("_")
    return parts[0] + "".join(part.title() for part in parts[1:])


class CamelModel(BaseModel):
    """JSON uses camelCase (truckId) while Python uses snake_case (truck_id)."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ErrorBody(BaseModel):
    code: str
    message: str


class SuccessResponse(CamelModel):
    success: bool = True
    data: Optional[Union[dict, list, Any]] = None


class ErrorResponse(CamelModel):
    success: bool = False
    error: ErrorBody
