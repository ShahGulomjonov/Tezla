from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any
from datetime import datetime

class Project(BaseModel):
    id: str
    title: str
    genre: str = "Unknown"
    runtime: str = "00:00"
    runtimeSeconds: int = 0
    condensedDuration: str = "00:00"
    condensedSeconds: int = 0
    director: str = ""
    rating: Any = "Unrated"  # Can be str ("PG-13") or float (8.5 from TMDB)
    language: str = "Unknown"
    year: int = 2024
    status: Literal['uploaded', 'processing', 'ready', 'exported', 'error'] = 'uploaded'
    progress: float = 0.0
    confidence: float = 0.0
    thumbnailGradient: str = "linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 30%, #1a2d4e 70%, #0f1a2e 100%)"
    narrativeRetention: float = 0.0
    compressionRatio: float = 0.0
    processedAt: Optional[str] = None
    scenes: List[dict] = []  # Flexible dict for both pipeline and TMDB scenes

    # Internal paths
    original_file: str = ""
    output_file: str = ""

    # TMDB-specific fields
    tmdb_id: Optional[int] = None
    poster_url: str = ""
    backdrop_url: str = ""
    youtube_trailer_key: Optional[str] = None
    overview: str = ""
    cast: List[str] = []
    vote_average: float = 0.0

    class Config:
        # Allow extra fields for flexibility
        extra = "allow"
