"""
TMDB API proxy module — fetches movie data from The Movie Database API.
"""
import httpx
from config import settings

HEADERS = {
    "accept": "application/json"
}

def _params(**extra):
    """Build query params with API key."""
    return {"api_key": settings.TMDB_API_KEY, **extra}

async def search_movies(query: str, page: int = 1):
    """Search movies by title."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.TMDB_BASE_URL}/search/movie",
            params=_params(query=query, page=page, include_adult=False),
            headers=HEADERS,
            timeout=10
        )
        resp.raise_for_status()
        return resp.json()

async def get_trending(time_window: str = "week"):
    """Get trending movies (day/week)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.TMDB_BASE_URL}/trending/movie/{time_window}",
            params=_params(),
            headers=HEADERS,
            timeout=10
        )
        resp.raise_for_status()
        return resp.json()

async def get_popular(page: int = 1):
    """Get popular movies."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.TMDB_BASE_URL}/movie/popular",
            params=_params(page=page),
            headers=HEADERS,
            timeout=10
        )
        resp.raise_for_status()
        return resp.json()

async def get_movie_detail(tmdb_id: int):
    """Get full movie details with videos and credits."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}",
            params=_params(append_to_response="videos,credits"),
            headers=HEADERS,
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract ALL YouTube videos
        all_videos = []
        trailer_key = None
        if "videos" in data and "results" in data["videos"]:
            for video in data["videos"]["results"]:
                if video.get("site") == "YouTube" and video.get("key"):
                    all_videos.append({
                        "key": video["key"],
                        "name": video.get("name", ""),
                        "type": video.get("type", ""),
                        "official": video.get("official", False),
                    })
                    if not trailer_key and video.get("type") == "Trailer":
                        trailer_key = video["key"]
            # Fallback: use first available YouTube video
            if not trailer_key and all_videos:
                trailer_key = all_videos[0]["key"]

        data["youtube_trailer_key"] = trailer_key
        data["all_videos"] = all_videos
        return data

def build_image_url(path: str, size: str = "w500") -> str:
    """Build full TMDB image URL."""
    if not path:
        return ""
    return f"{settings.TMDB_IMAGE_BASE}/{size}{path}"

def tmdb_to_project_data(movie: dict) -> dict:
    """Convert TMDB movie data to Tezla project format."""
    runtime_sec = (movie.get("runtime") or 120) * 60
    h, remainder = divmod(runtime_sec, 3600)
    m, s = divmod(remainder, 60)
    runtime_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

    # Condensed = ~15 min or 25% of original, whichever is smaller
    condensed_sec = min(900, int(runtime_sec * 0.25))
    ch, cr = divmod(condensed_sec, 3600)
    cm, cs = divmod(cr, 60)
    condensed_str = f"{ch:02d}:{cm:02d}:{cs:02d}" if ch > 0 else f"{cm:02d}:{cs:02d}"

    genres = [g["name"] for g in movie.get("genres", [])]
    cast = []
    if "credits" in movie and "cast" in movie["credits"]:
        cast = [c["name"] for c in movie["credits"]["cast"][:5]]

    backdrop = build_image_url(movie.get("backdrop_path"), "original")
    poster = build_image_url(movie.get("poster_path"), "w500")

    return {
        "tmdb_id": movie["id"],
        "title": movie.get("title", "Unknown"),
        "overview": movie.get("overview", ""),
        "year": int(movie.get("release_date", "2024")[:4]) if movie.get("release_date") else 2024,
        "runtime": runtime_str,
        "runtimeSeconds": runtime_sec,
        "condensedDuration": condensed_str,
        "condensedSeconds": condensed_sec,
        "genre": ", ".join(genres[:3]) if genres else "Drama",
        "rating": movie.get("vote_average", 0),
        "poster_url": poster,
        "backdrop_url": backdrop,
        "cast": cast,
        "youtube_trailer_key": movie.get("youtube_trailer_key"),
        "all_videos": movie.get("all_videos", []),
        "vote_average": movie.get("vote_average", 0),
    }
