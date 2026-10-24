from typing import List, Optional
from fastapi import APIRouter, Query
from backend.app.schemas.analyze import CandidatePlace
from backend.app.services.geo_provider import get_geo_provider

router = APIRouter()


@router.get(
    "/candidates",
    response_model=List[CandidatePlace],
    summary="Browse or search curated candidate places in Kota, Rajasthan",
)
async def list_candidates(
    category: Optional[str] = Query(None, description="Filter by category or architectural type"),
    q: Optional[str] = Query(None, description="Search keyword in name or description"),
) -> List[CandidatePlace]:
    """
    Returns verified places in the Kota, Rajasthan geographic database.
    Each place includes exact coordinates, category, visual features, and traceable provenance.
    """
    provider = get_geo_provider()

    if q:
        raw_candidates = provider.get_candidates_by_keywords([q])
    elif category:
        raw_candidates = provider.get_candidates_by_category(category)
    else:
        raw_candidates = provider.get_all_candidates()

    return [CandidatePlace(**c) for c in raw_candidates]
