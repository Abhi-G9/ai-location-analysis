import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.evaluation_service import run_benchmark_evaluation


@pytest.fixture
def client():
    return TestClient(app)


def test_evaluation_benchmark_execution():
    """
    Acceptance test: Evaluation benchmark executes systematically on positive,
    challenging, and negative test samples, producing real metrics.
    """
    report = run_benchmark_evaluation()

    assert report["total_samples"] >= 10
    assert report["positive_samples_count"] >= 6
    assert report["negative_samples_count"] >= 3

    # Top-1 and Top-5 accuracy validation
    assert report["top_1_accuracy_percent"] >= 75.0, f"Expected top-1 >= 75%, got {report['top_1_accuracy_percent']}%"
    assert report["top_5_accuracy_percent"] >= 90.0, f"Expected top-5 >= 90%, got {report['top_5_accuracy_percent']}%"

    # Median error on positive samples should be tightly bounded
    assert report["median_error_km"] is not None
    assert report["median_error_km"] < 2.0, f"Expected median error < 2.0 km, got {report['median_error_km']} km"

    # Negative images MUST abstain
    assert report["negative_abstention_rate_percent"] >= 90.0, (
        f"Expected negative abstention >= 90%, got {report['negative_abstention_rate_percent']}%"
    )

    # False positive rate on non-places must be 0%
    assert report["false_positive_rate_percent"] == 0.0, (
        f"Expected false positive rate == 0%, got {report['false_positive_rate_percent']}%"
    )


def test_evaluation_model_cards_and_limitations():
    """
    Acceptance test: Model cards and system limitations are comprehensively documented.
    """
    report = run_benchmark_evaluation()

    assert len(report["model_cards"]) >= 4
    model_names = [m["model_name"] for m in report["model_cards"]]
    assert any("DINOv2" in name for name in model_names)
    assert any("OpenCLIP" in name for name in model_names)
    assert any("RapidOCR" in name for name in model_names)
    assert any("OpenCV" in name for name in model_names)

    assert len(report["limitations"]) >= 3
    assert len(report["future_work"]) >= 3


def test_evaluation_api_endpoint(client):
    """
    Acceptance test: GET /api/v1/evaluation/metrics returns the full benchmark report.
    """
    response = client.get("/api/v1/evaluation/metrics")
    assert response.status_code == 200
    data = response.json()

    assert "top_1_accuracy_percent" in data
    assert "top_5_accuracy_percent" in data
    assert "median_error_km" in data
    assert "negative_abstention_rate_percent" in data
    assert "false_positive_rate_percent" in data
    assert "model_cards" in data
    assert "sample_results" in data
    assert len(data["sample_results"]) > 0
