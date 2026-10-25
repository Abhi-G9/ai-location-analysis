import os
import sys
import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure both repo root and backend directory are in sys.path
_current_file = os.path.abspath(__file__)
_app_dir = os.path.dirname(_current_file)
_backend_dir = os.path.dirname(_app_dir)
_repo_dir = os.path.dirname(_backend_dir)
for _p in [_repo_dir, _backend_dir]:
    if _p and _p not in sys.path:
        sys.path.insert(0, _p)

from backend.app.api.v1.router import api_router
from backend.app.api.v1.endpoints import analyze, health
from backend.app.core.config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("geolens")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "GeoLens AI - Image Geolocation analysis platform using a multi-stage evidence verification pipeline."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS origins configuration with explicit production origin guaranteed
raw_origins = list(settings.ALLOWED_ORIGINS) if isinstance(settings.ALLOWED_ORIGINS, (list, tuple)) else [settings.ALLOWED_ORIGINS]
allowed_origins_set = set(raw_origins)
allowed_origins_set.add("https://ai-location-analysis.vercel.app")
cors_origins_list = sorted(list(allowed_origins_set))

# CORS middleware for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount versioned API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Convenience root aliases so requests to /analyze and /health work at root as well as /api/v1/*
app.include_router(analyze.router, tags=["Root Aliases"], include_in_schema=False)
app.include_router(health.router, tags=["Root Aliases"], include_in_schema=False)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint welcoming users and providing API links."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "endpoints": {
            "health": f"{settings.API_V1_PREFIX}/health",
            "analyze": f"{settings.API_V1_PREFIX}/analyze",
            "docs": "/docs",
        },
    }


def _get_cors_headers(request: Request) -> dict:
    """Helper to ensure error responses always include CORS headers for allowed origins."""
    origin = request.headers.get("origin")
    if origin and (origin in cors_origins_list or origin.rstrip("/") in [o.rstrip("/") for o in cors_origins_list]):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure HTTPExceptions include CORS headers so browsers receive the true status code."""
    headers = _get_cors_headers(request)
    if exc.headers:
        headers.update(exc.headers)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to ensure internal stack traces are never leaked,
    while guaranteeing CORS headers are present so browsers don't report CORS blockage.
    """
    logger.error("Unhandled error processing %s: %s", request.url.path, exc, exc_info=True)
    headers = _get_cors_headers(request)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later.",
        },
        headers=headers,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
