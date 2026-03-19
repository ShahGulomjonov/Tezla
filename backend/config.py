import os
from dotenv import load_dotenv

# Load .env file BEFORE pydantic settings
load_dotenv(override=True)

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "")
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE: str = "https://image.tmdb.org/t/p"

    # Storage Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    STORAGE_DIR: str = os.path.join(BASE_DIR, "backend", "storage")
    UPLOAD_DIR: str = os.path.join(STORAGE_DIR, "uploads")
    PROCESSED_DIR: str = os.path.join(STORAGE_DIR, "processed")
    OUTPUT_DIR: str = os.path.join(STORAGE_DIR, "output")

    # App Settings
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
    ).split(",")
    TARGET_BUDGET_SECONDS: int = 1500  # 25 minutes default

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

# Debug: print loaded keys
print(f"[Config] TMDB_API_KEY: {'***' + settings.TMDB_API_KEY[-4:] if settings.TMDB_API_KEY else 'NOT SET'}")
