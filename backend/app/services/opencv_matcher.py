import logging
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("geolens.opencv_matcher")

# Initialize ORB detector with 600 features
_orb_detector = cv2.ORB_create(nfeatures=600, scaleFactor=1.2, nlevels=8)
_matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)


def extract_orb_descriptors(image: Image.Image) -> Tuple[Optional[List[cv2.KeyPoint]], Optional[np.ndarray]]:
    """Extract ORB keypoints and binary descriptors from a PIL Image."""
    try:
        if image.mode != "RGB":
            rgb_img = image.convert("RGB")
        else:
            rgb_img = image
        img_np = np.array(rgb_img)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        kps, des = _orb_detector.detectAndCompute(gray, None)
        return kps, des
    except Exception as exc:
        logger.error("Error extracting ORB descriptors: %s", exc)
        return None, None


def compute_geometric_matching(
    query_kps: Optional[List[cv2.KeyPoint]],
    query_des: Optional[np.ndarray],
    ref_kps: Optional[List[cv2.KeyPoint]],
    ref_des: Optional[np.ndarray],
) -> Dict[str, Any]:
    """
    Perform 2D geometric feature matching between query image and candidate reference image.
    Uses Hamming distance matching followed by RANSAC homography estimation to filter out outliers.
    """
    if query_des is None or ref_des is None or len(query_des) == 0 or len(ref_des) == 0:
        return {
            "raw_matches": 0,
            "ransac_inliers": 0,
            "inlier_ratio": 0.0,
            "structural_agreement": "No Descriptors Available",
        }

    try:
        # Match descriptors using cross-checking
        matches = _matcher.match(query_des, ref_des)
        raw_count = len(matches)

        if raw_count < 4 or query_kps is None or ref_kps is None:
            return {
                "raw_matches": raw_count,
                "ransac_inliers": 0,
                "inlier_ratio": 0.0,
                "structural_agreement": "Insufficient Keypoints",
            }

        # Extract coordinates of matched keypoints
        src_pts = np.float32([query_kps[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([ref_kps[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

        # RANSAC homography verification (threshold 5.0 pixels)
        _, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)

        inliers = int(np.sum(mask)) if mask is not None else 0
        ratio = round(inliers / raw_count, 3) if raw_count > 0 else 0.0

        if inliers >= 25 and ratio >= 0.25:
            agreement = "Strong Geometric Correspondence"
        elif inliers >= 12 and ratio >= 0.15:
            agreement = "Moderate Structural Overlap"
        elif inliers >= 5:
            agreement = "Weak / Incidental Matches"
        else:
            agreement = "No Structural Correspondence"

        return {
            "raw_matches": raw_count,
            "ransac_inliers": inliers,
            "inlier_ratio": ratio,
            "structural_agreement": agreement,
        }

    except Exception as exc:
        logger.error("Error during OpenCV geometric matching: %s", exc)
        return {
            "raw_matches": 0,
            "ransac_inliers": 0,
            "inlier_ratio": 0.0,
            "structural_agreement": f"Matching Error: {str(exc)}",
        }
