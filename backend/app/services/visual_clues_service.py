import logging
from typing import Any, Dict, List
import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("geolens.visual_clues")


def analyze_image_heuristics(image: Image.Image) -> Dict[str, Any]:
    """
    Extract factual visual heuristics from the image:
    - Luminance & brightness level
    - Sharpness / blurriness metric using Laplacian variance
    - Dominant color swatches with hex representations
    - Aspect ratio and framing
    """
    try:
        # Convert to RGB numpy array
        if image.mode != "RGB":
            rgb_img = image.convert("RGB")
        else:
            rgb_img = image

        img_np = np.array(rgb_img)
        h, w = img_np.shape[:2]

        # 1. Aspect Ratio
        aspect_ratio = round(w / h, 2) if h > 0 else 1.0
        if aspect_ratio > 1.15:
            framing = "Landscape"
        elif aspect_ratio < 0.85:
            framing = "Portrait"
        else:
            framing = "Square"

        # 2. Brightness / Luminance
        # Per standard ITU-R BT.601 luminance formula
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        mean_luminance = float(np.mean(gray))
        brightness_pct = round((mean_luminance / 255.0) * 100, 1)

        if brightness_pct < 25:
            lighting = "Dark / Low Light / Night"
        elif brightness_pct < 50:
            lighting = "Dim / Overcast / Indoor"
        elif brightness_pct < 75:
            lighting = "Well-lit / Daylight"
        else:
            lighting = "High Exposure / Harsh Sunlight"

        # 3. Sharpness / Focus
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if laplacian_var < 80.0:
            focus_quality = "Soft / Blurred"
        elif laplacian_var < 350.0:
            focus_quality = "Moderate Sharpness"
        else:
            focus_quality = "Crisp / High Detail"

        # 4. Dominant Colors (Quantization)
        # Downscale for rapid color analysis
        small = cv2.resize(img_np, (64, 64), interpolation=cv2.INTER_AREA)
        pixels = small.reshape(-1, 3).astype(np.float32)

        # K-Means clustering for 4 dominant color centers
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0)
        k = 4
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)

        counts = np.bincount(labels.flatten())
        total_pixels = len(labels)
        sorted_indices = np.argsort(-counts)

        dominant_colors: List[Dict[str, Any]] = []
        for idx in sorted_indices:
            r, g, b = [int(c) for c in centers[idx]]
            hex_code = f"#{r:02x}{g:02x}{b:02x}"
            coverage = round(float(counts[idx]) / total_pixels * 100, 1)
            dominant_colors.append({
                "hex": hex_code,
                "rgb": [r, g, b],
                "percentage": coverage,
            })

        return {
            "aspect_ratio": aspect_ratio,
            "framing": framing,
            "brightness_percent": brightness_pct,
            "lighting_condition": lighting,
            "sharpness_score": round(laplacian_var, 1),
            "focus_quality": focus_quality,
            "dominant_colors": dominant_colors,
        }

    except Exception as exc:
        logger.error("Error computing visual heuristics: %s", exc)
        return {
            "aspect_ratio": 1.0,
            "framing": "Unknown",
            "brightness_percent": 50.0,
            "lighting_condition": "Unknown",
            "sharpness_score": 0.0,
            "focus_quality": "Unknown",
            "dominant_colors": [],
        }
