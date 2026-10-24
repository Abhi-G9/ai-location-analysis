from fastapi import APIRouter
from backend.app.api.v1.endpoints import analyze, candidates, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(analyze.router, tags=["Image Analysis"])
api_router.include_router(candidates.router, tags=["Geographic Candidates"])
