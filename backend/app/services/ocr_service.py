import logging
import re
from typing import Any, Dict, List, Optional
import numpy as np
from PIL import Image

logger = logging.getLogger("geolens.ocr")

_ocr_engine = None


def get_ocr_engine():
    """Lazy singleton instantiation of the RapidOCR ONNX model."""
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
            logger.info("RapidOCR ONNX engine initialized successfully.")
        except Exception as e:
            logger.error("Failed to initialize RapidOCR: %s", e)
            _ocr_engine = False
    return _ocr_engine if _ocr_engine is not False else None


# Known geographic terms, Indian state/city keywords, and road infrastructure clues
GEO_KEYWORD_PATTERNS = [
    r"\b(?:kota|rajasthan|jaipur|jodhpur|udaipur|bundi|baran|jhalawar|ajmer|delhi|mumbai)\b",
    r"\b(?:nh[- ]?\d+|sh[- ]?\d+|national highway|state highway)\b",
    r"\b(?:chambal|chauraha|circle|marg|road|flyover|ghat|chowk|nagar|colony|gate|bazaar|mandir|temple|masjid|gurudwara)\b",
    r"\b(?:32\d{4})\b",  # Kota / Rajasthan PIN code pattern (32xxxx)
]


def extract_text_clues(image: Image.Image) -> Dict[str, Any]:
    """
    Extract readable text using RapidOCR.
    Identifies detected text lines, confidence scores, bounding boxes,
    and highlights potential geographic clue words.
    """
    engine = get_ocr_engine()
    if engine is None:
        return {
            "engine_available": False,
            "detected_lines": [],
            "total_lines_found": 0,
            "combined_text": "",
            "candidate_geo_clues": [],
            "note": "OCR engine was unavailable or failed to initialize.",
        }

    try:
        # Convert PIL Image to RGB numpy array for OpenCV/ONNX processing
        if image.mode != "RGB":
            image_rgb = image.convert("RGB")
        else:
            image_rgb = image

        # Cap image resolution to max 1280px for OCR to avoid massive ONNX tensor memory allocations
        if image_rgb.width > 1280 or image_rgb.height > 1280:
            ocr_image = image_rgb.copy()
            ocr_image.thumbnail((1280, 1280), Image.Resampling.BILINEAR)
        else:
            ocr_image = image_rgb

        img_np = np.array(ocr_image)
        ocr_result, _ = engine(img_np)
        del img_np
        if ocr_image is not image_rgb:
            del ocr_image

        if not ocr_result:
            return {
                "engine_available": True,
                "detected_lines": [],
                "total_lines_found": 0,
                "combined_text": "",
                "candidate_geo_clues": [],
                "note": "No readable text detected in this image.",
            }

        detected_lines: List[Dict[str, Any]] = []
        raw_texts: List[str] = []

        for item in ocr_result:
            box, text, score = item
            clean_text = str(text).strip()
            if not clean_text:
                continue

            raw_texts.append(clean_text)
            detected_lines.append({
                "text": clean_text,
                "confidence": round(float(score), 3),
                "box": [[round(pt[0], 1), round(pt[1], 1)] for pt in box] if box else [],
            })

        combined_text = " ".join(raw_texts)

        # Detect candidate geographic markers and place names
        geo_clues: List[str] = []
        for pattern in GEO_KEYWORD_PATTERNS:
            matches = re.findall(pattern, combined_text, flags=re.IGNORECASE)
            for m in matches:
                normalized = m.strip().title()
                if normalized not in geo_clues:
                    geo_clues.append(normalized)

        return {
            "engine_available": True,
            "detected_lines": detected_lines,
            "total_lines_found": len(detected_lines),
            "combined_text": combined_text,
            "candidate_geo_clues": geo_clues,
            "note": f"Detected {len(detected_lines)} text region(s) using RapidOCR.",
        }

    except Exception as exc:
        logger.error("OCR extraction error: %s", exc, exc_info=True)
        return {
            "engine_available": True,
            "detected_lines": [],
            "total_lines_found": 0,
            "combined_text": "",
            "candidate_geo_clues": [],
            "note": f"Error running OCR analysis: {str(exc)}",
        }
