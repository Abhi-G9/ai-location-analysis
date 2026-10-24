import io
import httpx
from PIL import Image, ImageDraw
from PIL.ExifTags import Base, IFD

def main():
    # 1. Test GPS EXIF extraction
    img_gps = Image.new("RGB", (320, 240), color=(50, 100, 180))
    exif = img_gps.getexif()
    exif[Base.Make] = "Sony"
    exif[Base.Model] = "ILCE-7RM4"
    gps = exif.get_ifd(IFD.GPSInfo)
    gps[1] = "N"
    gps[2] = 25.1824
    gps[3] = "E"
    gps[4] = 75.8398
    buf_gps = io.BytesIO()
    img_gps.save(buf_gps, format="JPEG", exif=exif)

    r1 = httpx.post(
        "http://127.0.0.1:8000/api/v1/analyze",
        files={"file": ("chambal_gps.jpg", buf_gps.getvalue(), "image/jpeg")},
        timeout=30.0,
    )
    d1 = r1.json()
    print("=== TEST 1 (GPS EXIF) ===")
    print("Status:", r1.status_code, d1["status"])
    print("Has GPS:", d1["exif"]["has_gps"])
    print("GPS Coords:", d1["exif"]["gps"])
    print("Camera:", d1["exif"]["camera_make"], d1["exif"]["camera_model"])

    # 2. Test OCR Text extraction
    img_txt = Image.new("RGB", (400, 120), color="white")
    draw = ImageDraw.Draw(img_txt)
    draw.text((20, 40), "KOTA RAJASTHAN NH 52", fill="black")
    buf_txt = io.BytesIO()
    img_txt.save(buf_txt, format="JPEG")

    r2 = httpx.post(
        "http://127.0.0.1:8000/api/v1/analyze",
        files={"file": ("highway_sign.jpg", buf_txt.getvalue(), "image/jpeg")},
        timeout=30.0,
    )
    d2 = r2.json()
    print("\n=== TEST 2 (OCR Text) ===")
    print("OCR Total Lines:", d2["ocr"]["total_lines_found"])
    print("Candidate Geo Clues:", d2["ocr"]["candidate_geo_clues"])
    print("Combined Text:", repr(d2["ocr"]["combined_text"]))

    # 3. Test OpenCLIP & Heuristics
    print("\n=== TEST 3 (OpenCLIP & Heuristics) ===")
    print("Top Scene:", d2["clip"]["top_environments"][0])
    print("Sharpness:", d2["heuristics"]["sharpness_score"], d2["heuristics"]["focus_quality"])
    print("Lighting:", d2["heuristics"]["lighting_condition"], f"{d2['heuristics']['brightness_percent']}%")
    print("Dominant Swatches Count:", len(d2["heuristics"]["dominant_colors"]))
    print("Summary Clues Count:", len(d2["summary_clues"]))
    print("Sample Summary Clue:", d2["summary_clues"][0])

if __name__ == "__main__":
    main()
