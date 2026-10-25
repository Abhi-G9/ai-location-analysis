from abc import ABC, abstractmethod
import json
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

logger = logging.getLogger("geolens.geo_provider")


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in kilometers."""
    r = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class GeoDataProvider(ABC):
    """
    Abstract geographic data provider interface.
    Allows swappable geocoding, candidate retrieval, and spatial lookups.
    """

    @abstractmethod
    def get_all_candidates(self) -> List[Dict[str, Any]]:
        """Retrieve all documented candidates in the dataset."""
        pass

    @abstractmethod
    def get_candidates_by_coordinates(
        self, latitude: float, longitude: float, radius_km: float = 25.0
    ) -> List[Dict[str, Any]]:
        """Retrieve candidates within radius_km of the given coordinates."""
        pass

    @abstractmethod
    def get_candidates_by_keywords(self, keywords: List[str]) -> List[Dict[str, Any]]:
        """Retrieve candidates matching any of the provided keywords/text clues."""
        pass

    @abstractmethod
    def get_candidates_by_category(self, category_label: str) -> List[Dict[str, Any]]:
        """Retrieve candidates matching a semantic/architectural category."""
        pass

    @abstractmethod
    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """Reverse geocode decimal coordinates into a structured address."""
        pass

    @abstractmethod
    async def search_places_by_text(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search geographic places using text/signage query."""
        pass


class LocalCuratedDatasetProvider(GeoDataProvider):
    """
    Curated local dataset provider for Kota, Rajasthan.
    Guarantees 100% offline availability, zero third-party rate limits,
    and traceable provenance for all landmarks.
    """

    def __init__(self, data_path: Optional[str] = None):
        if data_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_path = os.path.join(base_dir, "data", "kota_candidates.json")

        self.data_path = data_path
        self._candidates: List[Dict[str, Any]] = []
        self._load_dataset()

    def _load_dataset(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                self._candidates = json.load(f)
            logger.info("Loaded %d curated candidate places from %s", len(self._candidates), self.data_path)
        except Exception as exc:
            logger.error("Failed to load curated candidates from %s: %s", self.data_path, exc)
            self._candidates = []

    def get_all_candidates(self) -> List[Dict[str, Any]]:
        return list(self._candidates)

    def get_candidates_by_coordinates(
        self, latitude: float, longitude: float, radius_km: float = 25.0
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for place in self._candidates:
            dist = haversine_distance_km(latitude, longitude, place["latitude"], place["longitude"])
            if dist <= radius_km:
                item = dict(place)
                item["distance_km"] = round(dist, 2)
                results.append(item)
        # Sort by distance
        results.sort(key=lambda x: x["distance_km"])
        return results

    def get_candidates_by_keywords(self, keywords: List[str]) -> List[Dict[str, Any]]:
        if not keywords:
            return []

        clean_keywords = [k.lower().strip() for k in keywords if len(k.strip()) >= 2]
        if not clean_keywords:
            return []

        scored_results: List[Tuple[int, Dict[str, Any]]] = []

        for place in self._candidates:
            score = 0
            name_lower = place["name"].lower()
            desc_lower = place["description"].lower()
            place_kws = [k.lower() for k in place.get("keywords", [])]

            for kw in clean_keywords:
                # Two-way substring match: is kw in name, or is name in kw?
                if kw in name_lower or name_lower in kw:
                    score += 5
                # Is place keyword in kw, or kw in place keyword?
                matched_pks = [pk for pk in place_kws if (pk in kw or kw in pk)]
                if matched_pks:
                    score += 3 * len(matched_pks)
                elif kw in desc_lower:
                    score += 1

            if score > 0:
                item = dict(place)
                item["match_score"] = score
                scored_results.append((score, item))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored_results]

    def get_candidates_by_category(self, category_label: str) -> List[Dict[str, Any]]:
        if not category_label:
            return []

        target = category_label.lower().strip()
        matched: List[Dict[str, Any]] = []

        for place in self._candidates:
            clip_match = place.get("clip_category_match", "").lower()
            cat = place.get("category", "").lower()
            if target in clip_match or target in cat or clip_match in target or cat in target:
                matched.append(dict(place))

        return matched

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """Local approximate reverse geocoding against nearest known landmark."""
        nearby = self.get_candidates_by_coordinates(latitude, longitude, radius_km=15.0)
        if nearby:
            nearest = nearby[0]
            return {
                "display_name": f"Near {nearest['name']}, {nearest['city']}, {nearest['state']}, India",
                "nearest_landmark": nearest["name"],
                "distance_km": nearest["distance_km"],
                "city": nearest["city"],
                "state": nearest["state"],
                "country": nearest["country"],
                "source": "Local Curated Kota Geo-Index",
            }
        return None

    async def search_places_by_text(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search local candidate places using keyword matching."""
        return self.get_candidates_by_keywords([query])[:limit]


class NominatimGeoProvider(GeoDataProvider):
    """
    OpenStreetMap Nominatim reverse geocoding provider.
    Complies with OSM usage policy:
    - Clear custom User-Agent
    - Rate limit enforcement (max 1 request/second)
    - Safe timeouts (3.0s) and fallback to local provider on error
    """

    def __init__(self, fallback_provider: GeoDataProvider, user_agent: str = "GeoLensAI-Geolocation/0.1.0"):
        self.fallback = fallback_provider
        self.user_agent = user_agent
        self.last_request_time = 0.0
        self.base_url = "https://nominatim.openstreetmap.org"

    def get_all_candidates(self) -> List[Dict[str, Any]]:
        return self.fallback.get_all_candidates()

    def get_candidates_by_coordinates(
        self, latitude: float, longitude: float, radius_km: float = 25.0
    ) -> List[Dict[str, Any]]:
        return self.fallback.get_candidates_by_coordinates(latitude, longitude, radius_km)

    def get_candidates_by_keywords(self, keywords: List[str]) -> List[Dict[str, Any]]:
        return self.fallback.get_candidates_by_keywords(keywords)

    def get_candidates_by_category(self, category_label: str) -> List[Dict[str, Any]]:
        return self.fallback.get_candidates_by_category(category_label)

    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        # Enforce 1 second rate limit between requests to respect OSM policy
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        self.last_request_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/reverse",
                    params={
                        "lat": latitude,
                        "lon": longitude,
                        "format": "jsonv2",
                        "zoom": 16,
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": self.user_agent},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    addr = data.get("address", {})
                    area = (
                        addr.get("suburb")
                        or addr.get("neighbourhood")
                        or addr.get("residential")
                        or addr.get("quarter")
                        or addr.get("city_district")
                        or ""
                    )
                    district = addr.get("state_district") or addr.get("county") or addr.get("city") or ""
                    return {
                        "display_name": data.get("display_name", ""),
                        "road": addr.get("road") or addr.get("pedestrian"),
                        "suburb": area,
                        "area": area,
                        "city": addr.get("city") or addr.get("town") or addr.get("county") or "",
                        "district": district,
                        "state": addr.get("state") or "",
                        "country": addr.get("country") or "",
                        "postcode": addr.get("postcode") or "",
                        "source": "OpenStreetMap Nominatim",
                    }
        except Exception as exc:
            logger.warning("Nominatim API lookup failed or timed out: %s. Falling back to local index.", exc)

        # Fallback to local index
        return await self.fallback.reverse_geocode(latitude, longitude)

    async def search_places_by_text(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        # Enforce 1 second rate limit between requests to respect OSM policy
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        self.last_request_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "q": query,
                        "format": "jsonv2",
                        "addressdetails": 1,
                        "limit": limit,
                    },
                    headers={"User-Agent": self.user_agent},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = []
                    for item in data:
                        addr = item.get("address", {})
                        city = (
                            addr.get("city")
                            or addr.get("town")
                            or addr.get("county")
                            or addr.get("state_district")
                            or ""
                        )
                        state = addr.get("state", "")
                        country = addr.get("country", "")
                        name = item.get("name") or item.get("display_name", "").split(",")[0]
                        area = (
                            addr.get("suburb")
                            or addr.get("neighbourhood")
                            or addr.get("residential")
                            or addr.get("quarter")
                            or addr.get("city_district")
                            or ""
                        )
                        candidates.append({
                            "id": f"osm-{item.get('osm_id', item.get('place_id'))}",
                            "name": name,
                            "category": item.get("type", "geographic_location"),
                            "latitude": float(item["lat"]),
                            "longitude": float(item["lon"]),
                            "precision": "specific_landmark" if item.get("type") in ["attraction", "tourism", "monument", "historic", "building"] else "city",
                            "area": area,
                            "city": city,
                            "district": addr.get("state_district") or city,
                            "state": state,
                            "country": country,
                            "postcode": addr.get("postcode") or "",
                            "description": item.get("display_name", ""),
                            "source": "OpenStreetMap Nominatim",
                            "license": "ODbL",
                            "matched_clues": [f"Online Geocoding Search: {query}"],
                            "retrieval_reasons": [f"Recognized place/signage text matching '{query}' via OpenStreetMap"],
                        })
                    if candidates:
                        return candidates
        except Exception as exc:
            logger.warning("Nominatim search failed for '%s': %s", query, exc)

        return await self.fallback.search_places_by_text(query, limit)


_default_provider: Optional[GeoDataProvider] = None


def get_geo_provider() -> GeoDataProvider:
    """Returns the configured GeoDataProvider singleton."""
    global _default_provider
    if _default_provider is None:
        local_provider = LocalCuratedDatasetProvider()
        # Wrap with Nominatim provider that safely falls back to local on failure
        _default_provider = NominatimGeoProvider(fallback_provider=local_provider)
    return _default_provider
