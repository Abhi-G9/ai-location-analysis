"""
Reference Photo Ingestion Script for AI Location Analysis.
Fetches genuine photographic assets from Wikimedia Commons with full attribution
and persists them into local reference directories.
"""
import logging
import os
import sys

# Ensure backend package is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.services.image_retrieval_service import (
    fetch_wikimedia_reference_images,
    download_and_verify_image,
    save_reference_photo_and_metadata,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s]: %(message)s")
logger = logging.getLogger("ingest_references")

CANDIDATE_SEARCH_MAP = {
    "kota-barrage": ["Kota Barrage"],
    "chambal-hanging-bridge": ["Kota Hanging Bridge"],
    "seven-wonders-park": ["Seven Wonders Kota"],
    "jagmandir-palace": ["Jagmandir Kota"],
    "garh-palace-kota": ["City Palace Kota", "Garh Palace Kota"],
    "chambal-riverfront": ["Kota Rajasthan river"],
    "abheda-mahal": ["Abheda Mahal"],
    "godavari-dham-temple": ["Godavari SUNDERKAND.jpg", "Godavari Dham Kota"],
    "kansua-temple": ["Kansua Kota"],
    "landmark-city-kunhari": ["Kota Rajasthan architecture"],
    "gaipernath-waterfall": ["Gapernath Kota"],
    "brijvilas-palace-museum": ["Government Museum Kota"],
}


def ingest_all_candidates():
    logger.info("Beginning reference photo ingestion from Wikimedia Commons...")
    total_saved = 0

    for place_id, queries in CANDIDATE_SEARCH_MAP.items():
        logger.info("Processing place: %s", place_id)
        saved_for_place = 0

        for query in queries:
            try:
                results = fetch_wikimedia_reference_images(query, limit=2)
                for res in results:
                    img_url = res.get("image_url")
                    if not img_url:
                        continue

                    img = download_and_verify_image(img_url)
                    if img is None:
                        continue

                    # Clean safe filename
                    base_name = os.path.splitext(os.path.basename(res["title"]))[0]
                    clean_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in base_name)[:40]
                    filename = f"{clean_name}.jpg"

                    save_path = save_reference_photo_and_metadata(
                        place_id=place_id,
                        image=img,
                        filename=filename,
                        metadata=res,
                    )
                    saved_for_place += 1
                    total_saved += 1
                    logger.info("Saved %s for %s -> %s", filename, place_id, save_path)
                    if saved_for_place >= 2:
                        break
            except Exception as exc:
                logger.warning("Error searching/saving for %s (query '%s'): %s", place_id, query, exc)

            if saved_for_place >= 2:
                break

    logger.info("Finished ingestion. Total genuine reference photos saved: %d", total_saved)
    return total_saved


if __name__ == "__main__":
    ingest_all_candidates()
