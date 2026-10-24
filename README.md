# GeoLens AI — AI Image Geolocation Platform

GeoLens AI is a modern, privacy-focused image geolocation platform inspired by the multi-stage evidence verification architecture of [Geo-Sleuth](https://github.com/Oldcircle/geo-sleuth).

Instead of treating image geolocation as a "black box" that guesses an exact coordinate out of nowhere, GeoLens AI builds an **evidence-based pipeline** that analyzes visual clues (EXIF tags, sign OCR, landmark geometry, semantic CLIP embeddings, and DINOv2 visual features), matches against verified geographic databases, and reports an honest confidence level with explicit uncertainty bounds.

---

## Current Status: Phase 2 Complete (Visual Clues & Image Analysis)

This project is built phase-by-phase following strict engineering and pedagogical standards:

- [x] **Phase 1: Project Foundation & Image Intake** (Complete)
- [x] **Phase 2: Visual Clues & Metadata Extraction** (Complete)
- [ ] **Phase 3: Geographic Candidate Database (Kota / Rajasthan)** (Next)
- [ ] **Phase 4: AI Visual Matching & Ranking (CLIP, DINOv2, OpenCV)**
- [ ] **Phase 5: Verification, Leaflet Mapping & Honest Confidence**
- [ ] **Phase 6: Evaluation, Privacy Hardening & Release Readiness**

---

## Project Structure

```text
c:\Ai_Location_detect/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── analyze.py     # Image intake & validation endpoint
│   │   │       │   └── health.py      # Health check endpoint
│   │   │       └── router.py          # API v1 router
│   │   ├── core/
│   │   │   ├── config.py              # Environment configuration & Pydantic settings
│   │   │   └── security.py            # File sanitization, magic bytes, Pillow verify
│   │   ├── schemas/
│   │   │   ├── analyze.py             # Pydantic models for image intake
│   │   │   └── health.py              # Pydantic models for health check
│   │   ├── services/                  # Business logic services
│   │   └── main.py                    # FastAPI application & CORS setup
│   ├── tests/
│   │   ├── conftest.py                # Pytest fixtures & sample image generators
│   │   ├── test_health.py             # Health check tests
│   │   └── test_upload_validation.py  # Image validation & security tests
│   ├── requirements.txt               # Backend Python dependencies
│   └── .env.example                   # Backend environment sample
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisResults.tsx    # Displays verified intake results
│   │   │   ├── Header.tsx             # Navbar with privacy indicator
│   │   │   ├── ImageUploader.tsx      # Drag-and-drop image intake with preview
│   │   │   ├── PhaseNotice.tsx        # Phase roadmap & milestone banner
│   │   │   └── StatusBanner.tsx       # Live backend connectivity monitor
│   │   ├── services/
│   │   │   └── api.ts                 # Typed fetch client
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript data models
│   │   ├── App.tsx                    # Main layout
│   │   ├── index.css                  # Tailwind styles
│   │   └── main.tsx                   # React root entrypoint
│   ├── package.json                   # Frontend npm configuration
│   ├── tsconfig.json                  # TypeScript compiler settings
│   ├── vite.config.ts                 # Vite bundler & reverse proxy setup
│   └── tailwind.config.js             # Tailwind CSS design system
├── .env.example                       # Root environment variables sample
├── .gitignore                         # Comprehensive ignore list (no secrets)
├── pytest.ini                         # Pytest configuration
└── README.md                          # Documentation & guide
```

---

## Setup & Running the Application

### 1. Prerequisites
- **Python 3.11**
- **Node.js 18+** and **npm**

### 2. Backend Setup
From the project root:

```bash
# 1. Create a Python 3.11 virtual environment
uv venv .venv --python 3.11
# Or standard Python: python -m venv .venv

# 2. Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Copy environment configuration
cp .env.example .env

# 5. Start the FastAPI backend
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be available at:
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/v1/health`

### 3. Running Backend Tests
Execute the automated test suite with pytest:

```bash
.\.venv\Scripts\pytest -v
```

All 15 tests should pass, verifying health status, valid format uploads (JPEG, PNG, WebP), EXIF GPS coordinates, graceful handling of missing metadata, RapidOCR sign text detection, OpenCLIP semantic classification, computer vision heuristics (lighting, sharpness, dominant colors), rejection of non-images, oversized files, corrupted payloads, and path traversal protection.

---

## Phase 2 Milestone: Multi-Stage Visual Clues Extraction

In Phase 2, we incorporated real AI/ML visual feature extraction and metadata forensics:

1. **EXIF Metadata Forensics**:
   - Parses camera make, model, software, exposure time, aperture (f-number), focal length, ISO, and capture date.
   - Extracts GPS coordinates, altitude, and heading, converting rational degrees/minutes/seconds into decimal degrees.
   - Handles images with missing or stripped metadata gracefully without pipeline failure.
2. **Text Reading via RapidOCR**:
   - Uses a lightweight, high-performance ONNX model to read text on signboards, milestones, shopfronts, and posters.
   - Extracts bounding boxes and confidence scores, filtering for geographic keywords (e.g. "Kota", "Rajasthan", "NH 52").
3. **Computer Vision Heuristics**:
   - Calculates ITU-R BT.601 mean luminance for lighting conditions (daylight, golden hour, night).
   - Computes Laplacian variance for image focus and sharpness.
   - Quantizes dominant colors via K-Means clustering, providing hex values and area coverage.
4. **Zero-Shot Visual Semantics via OpenCLIP**:
   - Uses the pretrained `ViT-B-32` model (`laion2b_s34b_b79k`) to classify architectural styles, terrain types, and environmental settings.
   - Outputs factual cosine similarities and normalized feature vectors for subsequent geographic candidate matching.
   - Avoids redundant model reloading by caching reusable text embeddings.

### 4. Frontend Setup
From a new terminal window in the project root:

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

Open your browser at:
`http://127.0.0.1:5173`

---

## Architecture & Design Principles

1. **Honest AI**: Pretrained models cannot magically pinpoint arbitrary GPS coordinates without supporting visual evidence. We prioritize region- or city-level honesty over fabricated addresses.
2. **Safe Image Intake**:
   - Files are validated using binary magic numbers (e.g. `\xff\xd8\xff` for JPEG) before decoding.
   - Streamed chunking enforces memory limits (`MAX_UPLOAD_SIZE_MB = 10`) to prevent denial-of-service.
   - Pillow's `image.verify()` ensures corrupted or malicious files are rejected before processing.
   - Filenames are sanitized to prevent directory traversal.
3. **Strict Privacy**: Uploaded photographs are processed in-memory and not stored permanently on disk.
4. **Resilient Frontend**: Real-time health monitoring shows whether the API is connected, and informative error banners guide users when images exceed size limits or use unsupported formats.
