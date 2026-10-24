from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="API Health Check")
async def health_check() -> HealthResponse:
    """
    Check the health status of the GeoLens AI API.
    Used for monitoring and frontend connection verification.
    """
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        service=settings.PROJECT_NAME,
    )
