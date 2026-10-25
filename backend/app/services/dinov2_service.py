import logging
from typing import Optional, Tuple
from PIL import Image
import torch

logger = logging.getLogger("geolens.dinov2")

_dinov2_model = None
_dinov2_transform = None
_device = None


def get_dinov2_components():
    """Lazy singleton loader for the DINOv2 visual backbone."""
    global _dinov2_model, _dinov2_transform, _device
    from backend.app.core.config import settings

    if getattr(settings, "LOW_MEMORY_MODE", False):
        logger.info("LOW_MEMORY_MODE is active: Skipping DINOv2 ViT-S/14 weight loading to fit within RAM constraints.")
        return None, None, None

    if _dinov2_model is None:
        try:
            import timm

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = timm.create_model("vit_small_patch14_dinov2", pretrained=True, num_classes=0)
            model.to(device)
            model.eval()

            data_config = timm.data.resolve_model_data_config(model)
            transform = timm.data.create_transform(**data_config)

            _dinov2_model = model
            _dinov2_transform = transform
            _device = device
            logger.info("DINOv2 ViT-S/14 loaded on %s.", device)
        except Exception as exc:
            logger.error("Failed to load DINOv2 model: %s", exc, exc_info=True)
            _dinov2_model = False

    if _dinov2_model is False:
        return None, None, None
    return _dinov2_model, _dinov2_transform, _device


def extract_dinov2_features(image: Image.Image) -> Optional[torch.Tensor]:
    """
    Extract a normalized 384-dimensional DINOv2 embedding from a PIL Image.
    Returns:
        1D torch.Tensor of shape (384,) or None on failure.
    """
    model, transform, device = get_dinov2_components()
    if model is None:
        return None

    try:
        if image.mode != "RGB":
            rgb_image = image.convert("RGB")
        else:
            rgb_image = image

        tensor = transform(rgb_image).unsqueeze(0).to(device)
        with torch.no_grad():
            feat = model(tensor)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        return feat.squeeze(0).cpu()
    except Exception as exc:
        logger.error("DINOv2 feature extraction error: %s", exc)
        return None
