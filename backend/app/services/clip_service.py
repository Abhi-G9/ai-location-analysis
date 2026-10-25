import logging
from typing import Any, Dict, List, Optional
from PIL import Image
import torch

logger = logging.getLogger("geolens.clip")

_model = None
_preprocess = None
_tokenizer = None
_cached_text_embeddings = None

ENVIRONMENT_CANDIDATES = [
    ("Historic Fort / Palace", "an ancient historic fort, palace, or stone fortress"),
    ("Temple / Religious Monument", "a Hindu temple, religious monument, or shrine"),
    ("Bridge / River Crossing", "a suspension bridge, cable-stayed bridge, or river overpass"),
    ("Campus / Institutional Building", "an educational campus, university, coaching academy, or school building"),
    ("Riverfront / Ghat / Promenade", "a riverfront promenade, lake ghat, or water embankment"),
    ("Urban Market / Street Bazaar", "a crowded street bazaar, city market, or commercial roadway"),
    ("Public Garden / Park", "a landscaped city park, public garden, or green lawn"),
    ("Arid Ravine / Rocky Plateau", "an arid rocky canyon, dry river valley, or rocky plateau"),
    ("Indoor / Interior Scene", "an indoor room, office, or domestic interior"),
]

SETTING_CANDIDATES = [
    ("Dense Urban Cityscape", "dense urban cityscape with streets and concrete buildings"),
    ("River / Water Body", "scenic river body, reservoir, or open water"),
    ("Rocky Hills / Ravines", "rocky arid hills, cliffs, and semi-arid scrub vegetation"),
    ("Rural / Agricultural Plain", "open agricultural countryside, fields, and rural greenery"),
]


def get_clip_components():
    """Lazy singleton loader for the OpenCLIP model and pre-computed text embeddings."""
    global _model, _preprocess, _tokenizer, _cached_text_embeddings
    from backend.app.core.config import settings

    if getattr(settings, "LOW_MEMORY_MODE", False):
        logger.info("LOW_MEMORY_MODE is active: Skipping OpenCLIP ViT-B-32 weight loading to fit within RAM constraints.")
        return None, None, None, None

    if _model is None:
        try:
            import open_clip

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model, _, preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32",
                pretrained="laion2b_s34b_b79k",
                device=device,
            )
            model.eval()
            tokenizer = open_clip.get_tokenizer("ViT-B-32")

            # Pre-compute text embeddings to avoid re-tokenizing on each request
            with torch.no_grad():
                env_texts = [p[1] for p in ENVIRONMENT_CANDIDATES]
                env_tokens = tokenizer(env_texts).to(device)
                env_feats = model.encode_text(env_tokens)
                env_feats = env_feats / env_feats.norm(dim=-1, keepdim=True)

                setting_texts = [p[1] for p in SETTING_CANDIDATES]
                setting_tokens = tokenizer(setting_texts).to(device)
                setting_feats = model.encode_text(setting_tokens)
                setting_feats = setting_feats / setting_feats.norm(dim=-1, keepdim=True)

            _model = model
            _preprocess = preprocess
            _tokenizer = tokenizer
            _cached_text_embeddings = {
                "env": env_feats,
                "setting": setting_feats,
                "device": device,
            }
            logger.info("OpenCLIP ViT-B-32 loaded on %s with pre-computed text embeddings.", device)
        except Exception as exc:
            logger.error("Failed to load OpenCLIP model: %s", exc, exc_info=True)
            _model = False

    if _model is False:
        return None, None, None, None
    return _model, _preprocess, _tokenizer, _cached_text_embeddings


def analyze_with_clip(image: Image.Image) -> Dict[str, Any]:
    """
    Run zero-shot classification using OpenCLIP to extract visual semantic clues.
    Returns:
    - Top architectural / environment categories with real similarity scores
    - Top geographic setting categories
    - Raw 512-dimensional normalized embedding vector (for candidate matching)
    """
    model, preprocess, _, cached = get_clip_components()
    if model is None:
        return {
            "model_available": False,
            "top_environments": [],
            "top_settings": [],
            "embedding_dims": 0,
            "note": "OpenCLIP model was not available or failed to load.",
        }

    try:
        device = cached["device"]
        if image.mode != "RGB":
            image_rgb = image.convert("RGB")
        else:
            image_rgb = image

        tensor = preprocess(image_rgb).unsqueeze(0).to(device)

        with torch.no_grad():
            img_feat = model.encode_image(tensor)
            img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)

            # 1. Environment category similarities
            env_sims = (img_feat @ cached["env"].T).squeeze(0)
            # Softmax with standard temperature of 100 for relative probability distribution
            env_probs = torch.softmax(env_sims * 100.0, dim=-1)

            # 2. Setting category similarities
            setting_sims = (img_feat @ cached["setting"].T).squeeze(0)
            setting_probs = torch.softmax(setting_sims * 100.0, dim=-1)

            # Format results
            top_envs = []
            for i, (label, desc) in enumerate(ENVIRONMENT_CANDIDATES):
                cosine_sim = float(env_sims[i].item())
                prob = float(env_probs[i].item())
                top_envs.append({
                    "label": label,
                    "description": desc,
                    "cosine_similarity": round(cosine_sim, 4),
                    "relative_score": round(prob * 100, 1),
                })
            # Sort descending by cosine similarity
            top_envs.sort(key=lambda x: x["cosine_similarity"], reverse=True)

            top_settings = []
            for i, (label, desc) in enumerate(SETTING_CANDIDATES):
                cosine_sim = float(setting_sims[i].item())
                prob = float(setting_probs[i].item())
                top_settings.append({
                    "label": label,
                    "description": desc,
                    "cosine_similarity": round(cosine_sim, 4),
                    "relative_score": round(prob * 100, 1),
                })
            top_settings.sort(key=lambda x: x["cosine_similarity"], reverse=True)

            # First 5 dimensions as preview
            embedding_preview = [round(float(v), 4) for v in img_feat.squeeze(0)[:8].tolist()]

        return {
            "model_available": True,
            "model_name": "OpenCLIP ViT-B-32 (laion2b_s34b_b79k)",
            "top_environments": top_envs[:4],
            "top_settings": top_settings[:2],
            "embedding_dims": img_feat.shape[-1],
            "embedding_preview": embedding_preview,
            "note": (
                "Scores are actual model outputs. Cosine similarity reflects visual-semantic alignment; "
                "relative score is softmax over candidate prompts. Not a ground-truth probability."
            ),
        }

    except Exception as exc:
        logger.error("CLIP inference error: %s", exc, exc_info=True)
        return {
            "model_available": True,
            "top_environments": [],
            "top_settings": [],
            "embedding_dims": 0,
            "note": f"Error running CLIP inference: {str(exc)}",
        }
