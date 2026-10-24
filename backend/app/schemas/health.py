from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for the API health check response."""
    status: str = Field(..., json_schema_extra={"example": "ok"})
    version: str = Field(..., json_schema_extra={"example": "0.1.0"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    service: str = Field("GeoLens AI", json_schema_extra={"example": "GeoLens AI"})
