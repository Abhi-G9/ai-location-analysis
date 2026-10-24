# GeoLens AI — Evidence-Based AI Image Geolocation Platform

[![Pytest Test Suite](https://img.shields.io/badge/Pytest-40%20Passed-emerald.svg)](backend/tests)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal.svg)](https://fastapi.tiangolo.com/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet%20OSM-green.svg)](https://leafletjs.com/)
[![DINOv2 + OpenCLIP](https://img.shields.io/badge/Vision%20AI-DINOv2%20%7C%20OpenCLIP-purple.svg)](https://github.com/facebookresearch/dinov2)

**GeoLens AI** is an AI-powered image geolocation platform inspired by the multi-stage evidence verification architecture of [Geo-Sleuth](https://github.com/Oldcircle/geo-sleuth).

Instead of treating image geolocation as an opaque "black box" that hallucinates false coordinates, GeoLens AI implements a rigorous **six-stage evidence and verification pipeline**. The system extracts physical metadata, reads visible street signage via OCR, evaluates architectural geometries using self-supervised Vision Transformers (DINOv2), scores semantic scene categories via OpenCLIP, and cross-verifies candidates against OpenStreetMap-licensed databases before displaying an interactive map with calibrated confidence categories and explicit uncertainty bounds.

---

## Core Principles & Honest AI

1. **Pretrained Models Cannot Hallucinate Coordinates**: Pretrained visual embeddings capture patterns, not GPS lat/lons. Geolocation requires a multi-stage evidence cross-check.
2. **Explicit Confidence Categories**: Scores are not disguised as ground-truth probabilities. The pipeline outputs four calibrated categories:
   - `Verified Match`: Corroborated by physical GPS proximity (<1 km), unambiguous OCR signage text, or $\ge 15$ RANSAC geometric inliers.
   - `Plausible Candidate`: Strong multi-modal visual alignment without conclusive ground-truth telemetry.
   - `Low Confidence / Ambiguous`: Weak visual match or top candidates differ by $<4\%$ margin.
   - `Insufficient Evidence (Abstention)`: The system withholds coordinates and displays an informative banner when evidence is lacking.
3. **Transparent Confounding Factors**: Every result highlights "Why this prediction might be wrong" (e.g., missing EXIF tags, shared regional architectural motifs, or limited camera angles).
4. **Ephemeral In-Memory Privacy**: Uploaded photographs are processed strictly in RAM and never written to permanent disk storage or shared.

---

## Project Status: All 6 Phases Completed

- [x] **Phase 1: Project Foundation & Memory-Safe Intake** — Streaming 10MB cap, magic-byte inspection, Pillow verification, path traversal sanitization.
- [x] **Phase 2: Visual Clues & Forensics** — EXIF GPS DMS conversion, RapidOCR text reading, OpenCV color/sharpness heuristics, OpenCLIP ViT-B-32 embeddings.
- [x] **Phase 3: Geographic Candidate Database** — 12 verified landmark places in Kota, Rajasthan, OSM Nominatim provider abstraction, spatial and clue retrieval.
- [x] **Phase 4: AI Visual Matching & Multi-Modal Ranking** — Meta DINOv2 (`vit_small_patch14_dinov2`), OpenCLIP visual similarity, OpenCV ORB + RANSAC homography inliers, and transparent ranking.
- [x] **Phase 5: Verification, Leaflet Mapping & Calibrated Confidence** — Interactive OpenStreetMap Leaflet component, uncertainty radius circles, camera GPS telemetry lines, and abstention guardrails.
- [x] **Phase 6: Evaluation Benchmark, Model Cards & Release Readiness** — Systematic evaluation on positive, negative, and challenging test sets; model cards; API documentation.

---

## System Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │                   User Upload Photo                    │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │       Stage A: Safe Intake (Pillow & Magic Bytes)      │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               Stage B: Clue Extraction                 │
 │  • EXIF GPS & Camera Specs                             │
 │  • RapidOCR Signage & Milestone Text Extraction        │
 │  • OpenCLIP Zero-Shot Scene Classification             │
 │  • OpenCV Color Palette, Brightness & Sharpness        │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │        Stage C: Geographic Candidate Retrieval         │
 │  • Spatial Proximity Search (<25 km of EXIF GPS)       │
 │  • Text Keyword Matching (Kota, Chambal, NH-52)        │
 │  • CLIP Semantic Category Retrieval                    │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │         Stage D: AI Multi-Modal Feature Ranking        │
 │  Score = 50% DINOv2 + 35% CLIP + 15% OpenCV RANSAC     │
 │          + 0.25 OCR Boost + 0.30 GPS Proximity         │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │       Stage E: Cross-Verification & Calibration        │
 │  • Verified Match / Plausible / Low / Abstention       │
 │  • Precision Level (specific_landmark / city / etc.)   │
 │  • Estimated Error Radius (±0.25 km to ±20 km)         │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │       Stage F: Interactive Leaflet Cartography         │
 │  • OpenStreetMap Canvas with Custom SVG DivIcons       │
 │  • Uncertainty Error Circle Bounds                     │
 │  • Camera GPS Telemetry Link & Alternative Candidates  │
 └────────────────────────────────────────────────────────┘
```

---

## Evaluation Benchmark Results (Phase 6)

Tested systematically on a curated benchmark of positive landmark photographs, challenging perturbed images (low contrast, night lighting, crops), and negative controls (abstract noise, solid black sensor covers, interior rooms, out-of-region landmarks):

| Metric | Benchmark Result | Threshold / Target | Status |
| :--- | :--- | :--- | :--- |
| **Top-1 Accuracy** | **87.5%** | $\ge 75.0\%$ | Passed |
| **Top-5 Accuracy** | **100.0%** | $\ge 90.0\%$ | Passed |
| **Median Error Distance** | **0.00 km** | $< 2.0\text{ km}$ | Passed |
| **Negative Image Abstention Rate** | **100.0%** | $\ge 90.0\%$ | Passed |
| **False Positive Rate on Non-Places** | **0.0%** | $= 0.0\%$ | Passed |

---

## Model Cards

### 1. Meta DINOv2 (Vision Transformer)
- **Architecture**: `vit_small_patch14_dinov2` via `timm` (self-supervised on 142M images).
- **Embedding**: 384-dimensional dense patch representation.
- **Role**: Structural correspondence, architectural geometry, and landmark texture alignment without textual supervision.
- **Hardware**: CPU optimized; GPU acceleration available.

### 2. OpenCLIP
- **Architecture**: `ViT-B-32` (`laion2b_s34b_b79k`).
- **Embedding**: 512-dimensional normalized unit vector.
- **Role**: High-level visual-semantic alignment and zero-shot environment/scene categorization.

### 3. RapidOCR
- **Architecture**: Lightweight DBNet detection + CRNN recognition via ONNX Runtime.
- **Role**: Extracting visible text on Indian milestones, road signs, and monument entrance gates.

### 4. OpenCV ORB + RANSAC
- **Architecture**: Oriented FAST keypoints with Rotated BRIEF descriptors; Homography estimation via RANSAC (`cv2.findHomography`).
- **Role**: Mathematical verification of distinctive 2D planar feature points to eliminate false positive matches.

---

## Technology Stack

- **Backend**: Python 3.11, FastAPI, Pydantic v2, Uvicorn, Pillow, PyTorch, OpenCLIP, Timm (DINOv2), OpenCV, RapidOCR, AnyIO.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet, React-Leaflet, Lucide Icons.
- **Geographic Data**: OpenStreetMap, Nominatim API, Curated Kota Dataset.
- **Testing**: Pytest (40 automated tests), TypeScript `tsc --noEmit`.

---

## Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.11** (recommended: CPython 3.11)
- **Node.js 18+** and **npm**

### 2. Backend Setup
From the project root:

```powershell
# 1. Create a Python 3.11 virtual environment
uv venv .venv --python 3.11
# Or standard Python:
# python -m venv .venv

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Create local .env configuration
Copy-Item .env.example .env

# 5. Start the FastAPI backend server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now live at: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`
- Evaluation benchmark: `http://127.0.0.1:8000/api/v1/evaluation/metrics`

### 3. Frontend Setup
In a second terminal:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (Leaflet, React-Leaflet, Tailwind)
npm install

# 3. Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## Running the Automated Test Suite

Run all 40 backend unit, forensic, retrieval, ranking, mapping, and evaluation tests:

```powershell
.\.venv\Scripts\pytest -v
```

Run frontend TypeScript type-checking and build verification:

```powershell
npm --prefix frontend run build
```

---

## License & Attribution

- Built as an open, educational implementation of evidence-based computer vision geolocation.
- Map tiles: &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Geocoding data: OpenStreetMap Nominatim under the Open Database License (ODbL).
