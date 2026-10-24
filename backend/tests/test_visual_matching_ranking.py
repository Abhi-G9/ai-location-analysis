import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import torch

from backend.app.services.dinov2_service import extract_dinov2_features
from backend.app.services.opencv_matcher import compute_geometric_matching, extract_orb_descriptors
from backend.app.services.ranking_service import rank_candidates
from backend.app.services.reference_store import _create_synthetic_reference_image, get_reference_cache


def test_dinov2_feature_extraction_cpu():
    """Verify DINOv2 extracts 384-dimensional normalized features on CPU."""
    img = Image.new("RGB", (250, 250), color=(100, 150, 200))
    features = extract_dinov2_features(img)
    assert features is not None
    assert isinstance(features, torch.Tensor)
    assert features.shape == (384,)
    # Verify unit-norm normalization
    norm = torch.norm(features).item()
    assert abs(norm - 1.0) < 0.01


def test_positive_and_negative_dinov2_pairs():
    """
    Test known positive vs negative image pairs with DINOv2.
    A transformed/perturbed version of the same scene must have higher structural similarity
    than a completely different scene.
    """
    # Base scene: Kota Barrage synthetic pattern
    img_barrage = _create_synthetic_reference_image("kota-barrage")

    # Positive pair: Slight crop / resize / color shift of Kota Barrage
    img_barrage_pos = img_barrage.crop((10, 10, 390, 290)).resize((400, 300))

    # Negative pair: A completely different scene (Seven Wonders Park)
    img_seven_wonders = _create_synthetic_reference_image("seven-wonders-park")

    feat_base = extract_dinov2_features(img_barrage)
    feat_pos = extract_dinov2_features(img_barrage_pos)
    feat_neg = extract_dinov2_features(img_seven_wonders)

    sim_pos = torch.dot(feat_base, feat_pos).item()
    sim_neg = torch.dot(feat_base, feat_neg).item()

    assert sim_pos > sim_neg, f"Positive similarity ({sim_pos:.3f}) must exceed negative ({sim_neg:.3f})"
    assert sim_pos > 0.70, "Positive pair should yield high structural similarity"


def test_opencv_orb_geometric_inliers():
    """Verify that OpenCV ORB + RANSAC distinguishes matching structures from random noise."""
    ref_img = _create_synthetic_reference_image("chambal-hanging-bridge")
    ref_kps, ref_des = extract_orb_descriptors(ref_img)

    # Positive query: scaled/cropped version of the same bridge
    query_pos = ref_img.crop((5, 5, 395, 295)).resize((400, 300))
    q_kps, q_des = extract_orb_descriptors(query_pos)

    pos_match = compute_geometric_matching(q_kps, q_des, ref_kps, ref_des)
    assert pos_match["ransac_inliers"] >= 15
    assert pos_match["inlier_ratio"] > 0.15

    # Negative query: solid uniform color
    query_neg = Image.new("RGB", (400, 300), color="purple")
    neg_kps, neg_des = extract_orb_descriptors(query_neg)
    neg_match = compute_geometric_matching(neg_kps, neg_des, ref_kps, ref_des)
    assert neg_match["ransac_inliers"] == 0


def test_deterministic_ranking_pipeline(client: TestClient):
    """
    Verify that candidate ranking is fully deterministic.
    Submitting the exact same photograph twice produces identical candidate rankings and scores.
    """
    img = _create_synthetic_reference_image("kota-barrage")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    bytes_data = buf.getvalue()

    files1 = {"file": ("barrage_run1.jpg", bytes_data, "image/jpeg")}
    r1 = client.post("/api/v1/analyze", files=files1)
    assert r1.status_code == 200
    data1 = r1.json()

    files2 = {"file": ("barrage_run2.jpg", bytes_data, "image/jpeg")}
    r2 = client.post("/api/v1/analyze", files=files2)
    assert r2.status_code == 200
    data2 = r2.json()

    cand1 = data1["retrieval"]["candidates"]
    cand2 = data2["retrieval"]["candidates"]
    assert len(cand1) == len(cand2)
    for c1, c2 in zip(cand1, cand2):
        assert c1["name"] == c2["name"]
        assert c1["rank"] == c2["rank"]
        assert c1["composite_rank_score"] == c2["composite_rank_score"]


def test_ranking_evidence_breakdown(client: TestClient):
    """
    Verify that top-ranked candidates provide a transparent breakdown of
    DINOv2, CLIP, and OpenCV inlier scores.
    """
    img = _create_synthetic_reference_image("jagmandir-palace")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("jagmandir.jpg", buf.getvalue(), "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    retrieval = data["retrieval"]
    if retrieval["candidates"]:
        top = retrieval["candidates"][0]
        assert top["rank"] == 1
        assert "composite_rank_score" in top
        assert "dinov2_structural_similarity" in top
        assert "clip_visual_similarity" in top
        assert "opencv_feature_inliers" in top
        assert len(top["evidence_breakdown"]) >= 3


def test_similar_looking_not_blindly_declared_correct(client: TestClient):
    """
    Verify that a similar-looking but non-identical candidate is NOT automatically
    given a false 1.0 or fabricated 100% confidence.
    """
    # A generic river/bridge image without specific landmark signage
    img = Image.new("RGB", (300, 200), color=(50, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("generic_water.jpg", buf.getvalue(), "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    # Scores must remain conservative and honest
    if data["retrieval"]["candidates"]:
        for c in data["retrieval"]["candidates"]:
            # Scores should not falsely max out at 1.0 without corroborating evidence
            assert c["composite_rank_score"] < 0.95
