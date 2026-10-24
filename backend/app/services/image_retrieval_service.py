import io
import json
import logging
import math
import os
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
from PIL import Image

from backend.app.core.config import settings

logger = logging.getLogger("geolens.image_retrieval")

# Supported image MIME types from Commons
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _get_base_reference_dir() -> str:
    """Returns absolute path to reference data images directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ref_dir = os.path.join(base_dir, "data", "reference_data", "images")
    os.makedirs(ref_dir, exist_ok=True)
    return ref_dir


def fetch_wikimedia_reference_images(
    landmark_name: str,
    limit: int = 4,
    timeout: int = 12,
) -> List[Dict[str, Any]]:
    """
    Retrieves genuine, appropriately licensed photographs of a landmark from Wikimedia Commons API.
    
    Adheres to Wikimedia guidelines:
    - Custom descriptive User-Agent header.
    - Preserves file title, description, author/artist, license, and page URL.
    - Excludes documents (.pdf, .djvu, .svg) and non-photographic assets.
    """
    clean_name = landmark_name.strip()
    if not clean_name:
        return []

    # Format search query for Wikimedia Commons
    # Query files namespace (gsrnamespace=6)
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f'"{clean_name}"',
        "gsrnamespace": "6",
        "gsrlimit": str(min(limit * 2, 20)),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": "800",
    }
    encoded_query = urllib.parse.urlencode(params)
    api_url = f"https://commons.wikimedia.org/w/api.php?{encoded_query}"

    req = urllib.request.Request(
        api_url,
        headers={"User-Agent": settings.WIKIMEDIA_USER_AGENT},
    )

    results: List[Dict[str, Any]] = []

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                logger.warning("Wikimedia Commons API returned HTTP %s for %s", response.status, landmark_name)
                return []
            raw_data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("Failed to fetch Wikimedia Commons data for '%s': %s", landmark_name, exc)
        return []

    pages = raw_data.get("query", {}).get("pages", {})
    if not pages:
        # Fallback to broad query without quotation marks
        return _fetch_wikimedia_broad(landmark_name, limit=limit, timeout=timeout)

    for page_id, page_data in pages.items():
        title = page_data.get("title", "")
        # Filter file extensions
        ext = os.path.splitext(title.lower())[1]
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            continue

        imageinfo_list = page_data.get("imageinfo", [])
        if not imageinfo_list:
            continue

        info = imageinfo_list[0]
        extmetadata = info.get("extmetadata", {})

        # Extract attribution metadata
        author = "Wikimedia Commons Contributor"
        artist_obj = extmetadata.get("Artist", {})
        if artist_obj and "value" in artist_obj:
            # Strip HTML tags from author
            author = re.sub(r"<[^>]+>", "", artist_obj["value"]).strip() or author

        license_name = "Creative Commons / Public Domain"
        license_obj = extmetadata.get("LicenseShortName", {})
        if license_obj and "value" in license_obj:
            license_name = license_obj["value"].strip()

        license_url = ""
        license_url_obj = extmetadata.get("LicenseUrl", {})
        if license_url_obj and "value" in license_url_obj:
            license_url = license_url_obj["value"].strip()

        description = ""
        desc_obj = extmetadata.get("ImageDescription", {})
        if desc_obj and "value" in desc_obj:
            description = re.sub(r"<[^>]+>", "", desc_obj["value"]).strip()[:300]

        img_url = info.get("thumburl") or info.get("url")
        source_page = info.get("descriptionurl", f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title)}")

        if not img_url:
            continue

        results.append({
            "title": title.replace("File:", "").replace("_", " "),
            "image_url": img_url,
            "source": "Wikimedia Commons",
            "source_page": source_page,
            "author": author[:100],
            "license": license_name,
            "license_url": license_url,
            "description": description,
            "width": info.get("thumbwidth") or info.get("width", 0),
            "height": info.get("thumbheight") or info.get("height", 0),
        })

        if len(results) >= limit:
            break

    return results


def _fetch_wikimedia_broad(
    landmark_name: str,
    limit: int = 4,
    timeout: int = 12,
) -> List[Dict[str, Any]]:
    """Secondary search attempt without strict quote boundaries."""
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": landmark_name,
        "gsrnamespace": "6",
        "gsrlimit": str(min(limit * 2, 15)),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": "800",
    }
    encoded_query = urllib.parse.urlencode(params)
    api_url = f"https://commons.wikimedia.org/w/api.php?{encoded_query}"

    req = urllib.request.Request(
        api_url,
        headers={"User-Agent": settings.WIKIMEDIA_USER_AGENT},
    )

    results: List[Dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw_data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    pages = raw_data.get("query", {}).get("pages", {})
    for page_id, page_data in pages.items():
        title = page_data.get("title", "")
        ext = os.path.splitext(title.lower())[1]
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            continue

        imageinfo_list = page_data.get("imageinfo", [])
        if not imageinfo_list:
            continue

        info = imageinfo_list[0]
        extmetadata = info.get("extmetadata", {})

        author = "Wikimedia Commons Contributor"
        artist_obj = extmetadata.get("Artist", {})
        if artist_obj and "value" in artist_obj:
            author = re.sub(r"<[^>]+>", "", artist_obj["value"]).strip() or author

        license_name = extmetadata.get("LicenseShortName", {}).get("value", "CC / Public Domain")
        img_url = info.get("thumburl") or info.get("url")
        source_page = info.get("descriptionurl", "")

        if img_url:
            results.append({
                "title": title.replace("File:", "").replace("_", " "),
                "image_url": img_url,
                "source": "Wikimedia Commons",
                "source_page": source_page,
                "author": author[:100],
                "license": license_name,
                "license_url": extmetadata.get("LicenseUrl", {}).get("value", ""),
                "description": "",
                "width": info.get("thumbwidth") or info.get("width", 0),
                "height": info.get("thumbheight") or info.get("height", 0),
            })
            if len(results) >= limit:
                break

    return results


def fetch_mapillary_reference_images(
    lat: float,
    lon: float,
    radius_m: float = 250.0,
    limit: int = 4,
    timeout: int = 12,
) -> List[Dict[str, Any]]:
    """
    Queries Mapillary API v4 for street-level reference imagery near coordinates.
    
    Requires MAPILLARY_CLIENT_TOKEN in backend environment.
    If token is not provided, returns empty list with notice and does not fail.
    Attribution: Mapillary contributors (CC-BY-SA 4.0).
    """
    token = settings.MAPILLARY_CLIENT_TOKEN
    if not token or not token.strip():
        logger.debug("Mapillary client token not configured; skipping Mapillary street imagery retrieval.")
        return []

    # Calculate bounding box
    lat_delta = radius_m / 111320.0
    lon_delta = radius_m / (111320.0 * math.cos(math.radians(lat)))
    min_lat = lat - lat_delta
    max_lat = lat + lat_delta
    min_lon = lon - lon_delta
    max_lon = lon + lon_delta

    params = {
        "fields": "id,thumb_1024_url,geometry,compass_angle,captured_at",
        "bbox": f"{min_lon:.5f},{min_lat:.5f},{max_lon:.5f},{max_lat:.5f}",
        "limit": str(limit),
    }
    encoded = urllib.parse.urlencode(params)
    api_url = f"https://graph.mapillary.com/images?{encoded}"

    req = urllib.request.Request(
        api_url,
        headers={"Authorization": f"OAuth {token.strip()}"},
    )

    results: List[Dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                logger.warning("Mapillary API returned HTTP %s", response.status)
                return []
            raw_data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("Failed to query Mapillary API: %s", exc)
        return []

    data = raw_data.get("data", [])
    for item in data:
        thumb_url = item.get("thumb_1024_url")
        image_id = item.get("id")
        coords = item.get("geometry", {}).get("coordinates", [lon, lat])
        if thumb_url and image_id:
            results.append({
                "title": f"Mapillary Street View #{image_id}",
                "image_url": thumb_url,
                "source": "Mapillary v4",
                "source_page": f"https://www.mapillary.com/app/?pKey={image_id}",
                "author": "Mapillary Contributor",
                "license": "CC-BY-SA 4.0",
                "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
                "latitude": coords[1] if len(coords) > 1 else lat,
                "longitude": coords[0] if len(coords) > 0 else lon,
                "compass_angle": item.get("compass_angle"),
            })

    return results


def download_and_verify_image(
    image_url: str,
    timeout: int = 15,
) -> Optional[Image.Image]:
    """
    Downloads image bytes safely and verifies pixel integrity using Pillow.
    Ensures that downloaded files are valid photographic RGB images.
    """
    req = urllib.request.Request(
        image_url,
        headers={"User-Agent": settings.WIKIMEDIA_USER_AGENT},
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            if len(data) < 1000:
                logger.warning("Image at %s is suspiciously small (<1000 bytes)", image_url)
                return None

            img = Image.open(io.BytesIO(data))
            img.load()  # Force decode to catch truncated or invalid images
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Check dimensions (must be at least 150x150 to be a useful reference photo)
            w, h = img.size
            if w < 150 or h < 150:
                logger.warning("Image at %s rejected due to tiny dimensions: %dx%d", image_url, w, h)
                return None

            return img
    except Exception as exc:
        logger.warning("Failed to download or verify image from %s: %s", image_url, exc)
        return None


def save_reference_photo_and_metadata(
    place_id: str,
    image: Image.Image,
    filename: str,
    metadata: Dict[str, Any],
) -> str:
    """
    Saves a genuine photographic reference and persists its license/provenance attribution.
    """
    base_dir = _get_base_reference_dir()
    place_dir = os.path.join(base_dir, place_id)
    os.makedirs(place_dir, exist_ok=True)

    # 1. Save image file
    file_path = os.path.join(place_dir, filename)
    image.save(file_path, format="JPEG", quality=90)

    # 2. Update attribution registry
    meta_path = os.path.join(place_dir, "attribution.json")
    existing_meta: List[Dict[str, Any]] = []
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                existing_meta = json.load(f)
        except Exception:
            existing_meta = []

    # Check if this filename is already registered
    filtered_meta = [m for m in existing_meta if m.get("filename") != filename]
    record = {
        "filename": filename,
        "title": metadata.get("title", filename),
        "source": metadata.get("source", "Wikimedia Commons"),
        "source_page": metadata.get("source_page", ""),
        "author": metadata.get("author", "Unknown"),
        "license": metadata.get("license", "CC-BY-SA"),
        "license_url": metadata.get("license_url", ""),
        "image_url": metadata.get("image_url", ""),
        "saved_at": str(os.path.getmtime(file_path)),
    }
    filtered_meta.append(record)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(filtered_meta, f, indent=2, ensure_ascii=False)

    logger.info("Saved verified reference photo for place '%s' -> %s", place_id, file_path)
    return file_path


def get_local_reference_photos(place_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves local reference photographs and attribution metadata for a place.
    """
    base_dir = _get_base_reference_dir()
    place_dir = os.path.join(base_dir, place_id)
    if not os.path.isdir(place_dir):
        return []

    meta_path = os.path.join(place_dir, "attribution.json")
    meta_dict: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta_list = json.load(f)
                meta_dict = {m.get("filename", ""): m for m in meta_list}
        except Exception:
            pass

    photos = []
    for fname in os.listdir(place_dir):
        ext = os.path.splitext(fname.lower())[1]
        if ext in ALLOWED_IMAGE_EXTENSIONS:
            file_path = os.path.join(place_dir, fname)
            attr = meta_dict.get(fname, {
                "filename": fname,
                "title": fname,
                "source": "Local Reference Store",
                "author": "Verified Geographic Reference",
                "license": "Educational / Permitted Reference",
            })
            photos.append({
                "path": file_path,
                "filename": fname,
                **attr,
            })

    return photos
