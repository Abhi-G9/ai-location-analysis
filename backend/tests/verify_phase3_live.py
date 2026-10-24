import io
import httpx
from PIL import Image, ImageDraw
from PIL.ExifTags import Base, IFD

def main():
    base_url = "http://127.0.0.1:8000"

    # 1. Test GET /api/v1/candidates
    r_candidates = httpx.get(f"{base_url}/api/v1/candidates", timeout=10.0)
    print("=== TEST 1: Browse Candidate Database ===")
    print("Status:", r_candidates.status_code)
    candidates_list = r_candidates.json()
    print("Total Documented Places in Kota:", len(candidates_list))
    print("Sample Place:", candidates_list[0]["name"], "-", candidates_list[0]["category"])
    print("Source Attribution:", candidates_list[0]["source"])

    # 2. Test GET /api/v1/candidates?q=Seven Wonders
    r_search = httpx.get(f"{base_url}/api/v1/candidates?q=Seven Wonders", timeout=10.0)
    print("\n=== TEST 2: Candidate Search ===")
    search_res = r_search.json()
    print("Search 'Seven Wonders' Matches:", [p["name"] for p in search_res])

    # 3. Test POST /api/v1/analyze with GPS coordinates (Kota Barrage: 25.1782, 75.8272)
    img_gps = Image.new("RGB", (320, 240), color=(60, 120, 200))
    exif = img_gps.getexif()
    gps = exif.get_ifd(IFD.GPSInfo)
    gps[1] = "N"; gps[2] = 25.1782; gps[3] = "E"; gps[4] = 75.8272
    buf_gps = io.BytesIO()
    img_gps.save(buf_gps, format="JPEG", exif=exif)

    r_gps = httpx.post(
        f"{base_url}/api/v1/analyze",
        files={"file": ("barrage_gps_photo.jpg", buf_gps.getvalue(), "image/jpeg")},
        timeout=30.0,
    )
    d_gps = r_gps.json()
    print("\n=== TEST 3: Candidate Retrieval via GPS ===")
    print("Analysis Status:", r_gps.status_code, d_gps["status"])
    print("Retrieved Candidates Count:", d_gps["retrieval"]["candidates_retrieved_count"])
    top_c = d_gps["retrieval"]["candidates"][0]
    print("Top Retrieved Place:", top_c["name"])
    print("Distance from EXIF:", f"{top_c['distance_km']} km")
    print("Matched Clues:", top_c["matched_clues"])
    print("Retrieval Reasons:", top_c["retrieval_reasons"])

    # 4. Test POST /api/v1/analyze with OCR signboard
    img_txt = Image.new("RGB", (400, 120), color="white")
    draw = ImageDraw.Draw(img_txt)
    draw.text((20, 40), "CHAMBAL HANGING BRIDGE NH 52", fill="black")
    buf_txt = io.BytesIO()
    img_txt.save(buf_txt, format="JPEG")

    r_ocr = httpx.post(
        f"{base_url}/api/v1/analyze",
        files={"file": ("hanging_bridge_sign.jpg", buf_txt.getvalue(), "image/jpeg")},
        timeout=30.0,
    )
    d_ocr = r_ocr.json()
    print("\n=== TEST 4: Candidate Retrieval via OCR Signboard ===")
    print("Analysis Status:", r_ocr.status_code)
    ocr_candidates = [c["name"] for c in d_ocr["retrieval"]["candidates"]]
    print("Retrieved Candidate Names:", ocr_candidates)
    assert any("Hanging Bridge" in name for name in ocr_candidates)
    print("Success: Hanging Bridge successfully retrieved via OCR clues!")

    # 5. Test Abstention
    img_black = Image.new("RGB", (100, 100), color="black")
    buf_black = io.BytesIO()
    img_black.save(buf_black, format="PNG")
    r_abs = httpx.post(
        f"{base_url}/api/v1/analyze",
        files={"file": ("black.png", buf_black.getvalue(), "image/png")},
        timeout=30.0,
    )
    d_abs = r_abs.json()
    print("\n=== TEST 5: Honest Abstention Handling ===")
    print("Abstention Flag:", d_abs["retrieval"]["abstention"])
    print("Message:", d_abs["retrieval"]["message"])

if __name__ == "__main__":
    main()
