# AI Location Detect PRO — Multimodal Photographic Geolocation Platform

[![Live Frontend](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://ai-location-analysis.vercel.app)
[![Live Backend](https://img.shields.io/badge/Backend%20API-Render-46E3B7?logo=render)](https://ai-location-analysis.onrender.com/api/v1/health)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![OpenStreetMap](https://img.shields.io/badge/Geospatial-OpenStreetMap%20Nominatim-7EBC6F?logo=openstreetmap&logoColor=white)](https://nominatim.openstreetmap.org/)

**AI Location Detect PRO** is an end-to-end multimodal photographic geolocation and intelligence platform. It analyzes uploaded photographs to detect real-world locations, architectural monuments, street signage, terrain features, and camera telemetry—pinpointing confirmed coordinates on interactive maps and offering 1-click turn-by-turn navigation.

---

## 🌐 Live Deployments

- **Production Frontend (Vercel):** [https://ai-location-analysis.vercel.app](https://ai-location-analysis.vercel.app)
- **Production Backend API (Render):** [https://ai-location-analysis.onrender.com](https://ai-location-analysis.onrender.com)
- **API Documentation (Swagger/OpenAPI):** [https://ai-location-analysis.onrender.com/docs](https://ai-location-analysis.onrender.com/docs)
- **Health Check Endpoint:** [https://ai-location-analysis.onrender.com/api/v1/health](https://ai-location-analysis.onrender.com/api/v1/health)

---

## ⚡ Key Highlights & Core Engineering

1. **Spatial Grounding & Anti-Hallucination:**
   - Raw multimodal vision models often hallucinate coordinates. AI Location Detect implements a **Spatial Grounding Pipeline**: visual landmarks identified by the AI are corroborated against OpenStreetMap (Nominatim) GIS databases to guarantee authentic decimal latitude and longitude.
2. **Responsible AI Abstention:**
   - If a photo lacks distinctive architectural anchors, legible signage, or camera GPS (e.g. an indoor bedroom or plain selfie), the system intentionally **abstains from guessing**. Instead of inventing a false location, it presents a clear "Insufficient Evidence" breakdown with a diagnostic checklist.
3. **Hardware Telemetry & Zero-Latency EXIF Bypass:**
   - Evaluates binary EXIF metadata first. When native camera GPS coordinates are embedded, it reverse-geocodes them with 100% ground-truth accuracy in 0ms, saving external API tokens.
4. **Client-Side Canvas Payload Optimization:**
   - Uses an offscreen HTML5 Canvas algorithm to downscale high-resolution 4K smartphone photos (4000×3000px, 8MB) to crisp 1600px Full HD images (~300KB) in the browser before transmission.
   - **Cuts network payload by ~90%**, eliminates upload latency, and safeguards cloud memory limits.
5. **Turn-by-Turn Route Navigation:**
   - Generates a direct Google Maps Directions protocol link:
     `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
   - Automatically uses the user's mobile device or desktop GPS as the origin, starting instant turn-by-turn driving or walking directions.
6. **Community Reviews & 5-Star Feedback:**
   - Interactive feedback card featuring 1–5 stars, user name input, quick clue tags, and comment fields. Persists instantly in browser `localStorage` and updates community review feeds in real time.
7. **Single-Page Tab Navigation (Zero Reload):**
   - Instant client-side state switching across **Home**, **How It Works**, **Capabilities**, **Q&A**, and **About** pages without full-page reloads.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│              User Uploads Photo (Browser)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Client-Side Optimization (Offscreen HTML5 Canvas API)      │
│  • Resizes 4K/8MB photos to 1600px Full HD (~300 KB)        │
│  • Compresses payload by 90% for instant upload             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ HTTPS POST /api/v1/analyze
┌─────────────────────────────────────────────────────────────┐
│         FastAPI Asynchronous Backend (Uvicorn / Render)     │
│  • Magic-byte verification (JPEG, PNG, WebP)                │
│  • Filename sanitization & path-traversal prevention        │
│  • Binary EXIF metadata & GPS DMS coordinate extraction     │
│  • Image orientation normalization via ImageOps             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Multimodal AI Vision & OCR Extraction           │
│  • Google Gemini Vision API (Multimodal architectural scan) │
│  • RapidOCR (Lightweight Hindi/English road & sign reader)  │
│  • OpenCV color palette, brightness & sharpness heuristics  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│      Spatial Grounding & OpenStreetMap Geocoding            │
│  • In-memory TTL cache for instantaneous spatial queries    │
│  • Non-blocking asyncio rate limiting for Nominatim         │
│  • Reverse geocoding & address hierarchy synthesis         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Frontend Location Presentation                │
│  • Identified Place, City, State, Country, Postal Code      │
│  • 1-Click "Get Directions from My Location" (Google Maps)  │
│  • Coordinates Copy & Visual Confidence Badge               │
│  • 5-Star Community Feedback & User Review Logging          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | **React 18**, **TypeScript 5.4**, **Vite** |
| **Styling & Icons** | **Tailwind CSS 3.4**, **Lucide React** |
| **Image Compression** | **HTML5 Offscreen Canvas API** |
| **Backend Framework** | **Python 3.11**, **FastAPI 0.115**, **Uvicorn** |
| **Schema Validation** | **Pydantic v2**, **Pydantic-Settings** |
| **Multimodal AI** | **Google GenAI SDK / Gemini Vision API** (`gemini-3.5-flash-lite`) |
| **Computer Vision** | **Pillow (PIL)**, **OpenCV Headless**, **RapidOCR (ONNX)** |
| **Geospatial & Maps** | **OpenStreetMap Nominatim**, **Google Maps Directions API** |
| **Hosting & CI/CD** | **Vercel** (Frontend Edge CDN), **Render** (Backend Web Service), **Git** |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Python 3.11** installed
- **Node.js 18+** and **npm**

### 2. Backend Setup
From the project root:

```powershell
# 1. Create and activate a Python 3.11 virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Configure environment variables in .env
# Set GEMINI_API_KEY with your Google AI Studio key:
# GEMINI_API_KEY=your_gemini_api_key_here

# 4. Start the FastAPI development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is accessible at:
- **API Root:** `http://127.0.0.1:8000/`
- **Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/v1/health`

### 3. Frontend Setup
In a new terminal:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 🧪 Testing & Verification

Run backend unit and integration tests:
```powershell
.\.venv\Scripts\pytest -v
```

Verify frontend TypeScript types and production build:
```powershell
npm --prefix frontend run build
```

---

## 🔒 Security & Privacy

- **Ephemeral Processing:** Uploaded images are held strictly in temporary RAM buffers during inference and are permanently discarded via Python `gc.collect()`.
- **CORS Restricted:** Backend strictly enforces CORS origins (`https://ai-location-analysis.vercel.app` in production).
- **Magic-Byte Inspection:** Validates initial file bytes against known signatures (`\xff\xd8\xff` for JPEG, `\x89PNG` for PNG, `RIFF...WEBP` for WebP).
- **Input Sanitization:** Uses `os.path.basename` to prevent path-traversal attacks.

---

## 📬 Contact & Inquiries

- **Lead Developer:** Abhinav Gautam
- **Email:** [abhi.sys.01@gmail.com](mailto:abhi.sys.01@gmail.com)
- **Repository:** [https://github.com/Abhi-G9/ai-location-analysis](https://github.com/Abhi-G9/ai-location-analysis)
- **Live Application:** [https://ai-location-analysis.vercel.app](https://ai-location-analysis.vercel.app)
