import logging
from typing import Any, Dict, Optional, Tuple
from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS

logger = logging.getLogger("geolens.exif")


def _convert_to_degrees(value: Any) -> Optional[float]:
    """
    Helper function to convert the GPS coordinates stored in the EXIF to degrees in float format.
    Handles tuples/lists of (degrees, minutes, seconds) rational objects, as well as scalar rationals/floats.
    """
    if value is None:
        return None
    try:
        if isinstance(value, (tuple, list)):
            if len(value) == 0:
                return None
            if len(value) == 1:
                return float(value[0])
            d = float(value[0])
            m = float(value[1]) if len(value) > 1 else 0.0
            s = float(value[2]) if len(value) > 2 else 0.0
            return d + (m / 60.0) + (s / 3600.0)

        # Scalar float, int, or IFDRational
        return float(value)
    except Exception as err:
        logger.debug("Failed to convert GPS coordinates to degrees: %s", err)
        return None


def extract_exif_metadata(image: Image.Image) -> Dict[str, Any]:
    """
    Safely extract EXIF metadata from a PIL Image.
    Returns a dictionary of normalized EXIF fields including GPS coordinates,
    camera details, and capture settings.

    If EXIF or GPS is missing or scrubbed, returns a structured object indicating
    that metadata is unavailable without crashing.
    """
    result: Dict[str, Any] = {
        "has_exif": False,
        "has_gps": False,
        "camera_make": None,
        "camera_model": None,
        "software": None,
        "capture_date": None,
        "focal_length_mm": None,
        "aperture_f_number": None,
        "exposure_time_sec": None,
        "iso_speed": None,
        "orientation": None,
        "gps": None,
        "note": "Metadata is treated as an investigative clue, not absolute ground truth.",
    }

    try:
        raw_exif = image.getexif()
        if not raw_exif or len(raw_exif) == 0:
            return result

        result["has_exif"] = True
        exif_data: Dict[str, Any] = {}

        for tag_id, value in raw_exif.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            exif_data[tag_name] = value

        # Direct camera metadata
        result["camera_make"] = str(exif_data.get("Make")).strip() if exif_data.get("Make") else None
        result["camera_model"] = str(exif_data.get("Model")).strip() if exif_data.get("Model") else None
        result["software"] = str(exif_data.get("Software")).strip() if exif_data.get("Software") else None
        result["capture_date"] = str(exif_data.get("DateTimeOriginal") or exif_data.get("DateTime") or "").strip() or None

        if "Orientation" in exif_data:
            try:
                result["orientation"] = int(exif_data["Orientation"])
            except (ValueError, TypeError):
                pass

        if "FocalLength" in exif_data:
            try:
                result["focal_length_mm"] = round(float(exif_data["FocalLength"]), 1)
            except (ValueError, TypeError, ZeroDivisionError):
                pass

        if "FNumber" in exif_data:
            try:
                result["aperture_f_number"] = round(float(exif_data["FNumber"]), 1)
            except (ValueError, TypeError, ZeroDivisionError):
                pass

        if "ExposureTime" in exif_data:
            try:
                val = float(exif_data["ExposureTime"])
                result["exposure_time_sec"] = f"1/{round(1/val)}" if (0 < val < 1) else str(round(val, 2))
            except (ValueError, TypeError, ZeroDivisionError):
                pass

        if "ISOSpeedRatings" in exif_data:
            try:
                result["iso_speed"] = int(exif_data["ISOSpeedRatings"])
            except (ValueError, TypeError):
                pass

        # GPS extraction: check IFD GPSInfo (tag 34853 or raw_exif.get_ifd(0x8825))
        gps_info: Dict[str, Any] = {}
        try:
            gps_ifd = raw_exif.get_ifd(0x8825)
            if gps_ifd:
                for k, v in gps_ifd.items():
                    sub_tag = GPSTAGS.get(k, str(k))
                    gps_info[sub_tag] = v
        except Exception:
            pass

        # Fallback if GPSInfo was in standard dict
        if not gps_info and "GPSInfo" in exif_data:
            gps_raw = exif_data["GPSInfo"]
            if isinstance(gps_raw, dict):
                for k, v in gps_raw.items():
                    sub_tag = GPSTAGS.get(k, str(k))
                    gps_info[sub_tag] = v

        if gps_info:
            gps_lat = _convert_to_degrees(gps_info.get("GPSLatitude"))
            lat_ref = gps_info.get("GPSLatitudeRef")
            if gps_lat is not None and lat_ref in ["S", "s"]:
                gps_lat = -gps_lat

            gps_lon = _convert_to_degrees(gps_info.get("GPSLongitude"))
            lon_ref = gps_info.get("GPSLongitudeRef")
            if gps_lon is not None and lon_ref in ["W", "w"]:
                gps_lon = -gps_lon

            altitude = None
            if "GPSAltitude" in gps_info:
                try:
                    altitude = float(gps_info["GPSAltitude"])
                    if gps_info.get("GPSAltitudeRef") == 1:
                        altitude = -altitude
                except (ValueError, TypeError):
                    pass

            heading = None
            if "GPSImgDirection" in gps_info:
                try:
                    heading = round(float(gps_info["GPSImgDirection"]), 1)
                except (ValueError, TypeError):
                    pass

            if gps_lat is not None and gps_lon is not None:
                result["has_gps"] = True
                result["gps"] = {
                    "latitude": round(gps_lat, 6),
                    "longitude": round(gps_lon, 6),
                    "altitude_m": round(altitude, 1) if altitude is not None else None,
                    "heading_deg": heading,
                    "coordinate_provenance": "EXIF GPS header tag",
                }

    except Exception as exc:
        logger.warning("Error parsing image EXIF data: %s", exc)

    return result
