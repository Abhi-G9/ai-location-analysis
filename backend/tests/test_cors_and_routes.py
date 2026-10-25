from fastapi.testclient import TestClient
from backend.app.core.config import settings


def test_cors_options_preflight_vercel_origin(client: TestClient):
    """Verify that OPTIONS preflight from production Vercel frontend is accepted with CORS headers."""
    response = client.options(
        "/api/v1/analyze",
        headers={
            "Origin": "https://ai-location-analysis.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://ai-location-analysis.vercel.app"
    allow_methods = response.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods
    assert "OPTIONS" in allow_methods


def test_cors_options_preflight_localhost_origins(client: TestClient):
    """Verify that development origins (localhost and 127.0.0.1) are accepted with CORS headers."""
    for origin in ["http://localhost:5173", "http://127.0.0.1:5173"]:
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin


def test_cors_disallowed_origin_rejected(client: TestClient):
    """Verify that an arbitrary unauthorized origin does not receive Access-Control-Allow-Origin."""
    response = client.options(
        "/api/v1/analyze",
        headers={
            "Origin": "https://unauthorized-malicious-domain.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # Disallowed origins are rejected by CORSMiddleware without allow-origin header
    assert response.headers.get("access-control-allow-origin") is None


def test_root_health_alias_endpoint(client: TestClient):
    """Verify that GET /health works at root as well as /api/v1/health."""
    res_root = client.get("/health")
    res_v1 = client.get("/api/v1/health")
    assert res_root.status_code == 200
    assert res_v1.status_code == 200
    assert res_root.json()["status"] == res_v1.json()["status"]


def test_root_analyze_alias_options_cors(client: TestClient):
    """Verify that root /analyze endpoint also supports CORS preflight."""
    response = client.options(
        "/analyze",
        headers={
            "Origin": "https://ai-location-analysis.vercel.app",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://ai-location-analysis.vercel.app"


def test_cors_headers_on_error_response(client: TestClient):
    """Verify that error responses (400, 422, 500) preserve CORS headers so the browser sees the error status."""
    # POST to /api/v1/analyze without multipart file triggers 422 validation error
    response = client.post(
        "/api/v1/analyze",
        headers={
            "Origin": "https://ai-location-analysis.vercel.app",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "https://ai-location-analysis.vercel.app"


def test_cors_headers_on_health_get_response(client: TestClient):
    """Verify that GET /api/v1/health from production Vercel origin returns 200 with CORS headers."""
    response = client.get(
        "/api/v1/health",
        headers={
            "Origin": "https://ai-location-analysis.vercel.app",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://ai-location-analysis.vercel.app"

