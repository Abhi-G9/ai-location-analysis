import json
import os
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable overrides."""
    PROJECT_NAME: str = "AI Location Analysis"
    VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS configuration
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "https://ai-location-analysis.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Image validation constraints
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: Union[List[str], str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # External Provider Credentials & Headers (kept strictly backend-side)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    ENABLE_GOOGLE_VISION: bool = False
    GOOGLE_VISION_API_KEY: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    MAPILLARY_CLIENT_TOKEN: Optional[str] = None
    WIKIMEDIA_USER_AGENT: str = "AILocationAnalysis/1.0 (educational-geolocation-system; mailto:contact@example.com)"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.35

    @field_validator("ALLOWED_ORIGINS", "ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def parse_json_or_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [item.strip() for item in v.split(",") if item.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        ],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
