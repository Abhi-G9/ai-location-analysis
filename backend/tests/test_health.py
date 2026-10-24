from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test the root welcome endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "health" in data["endpoints"]
    assert "analyze" in data["endpoints"]


def test_health_check_endpoint(client: TestClient):
    """Test the GET /api/v1/health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert "timestamp" in data
    assert data["service"] == "GeoLens AI"
