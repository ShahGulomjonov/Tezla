import os
import logging
import random
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import settings
from models import Project
from typing import List, Optional
import tmdb
import yts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tezla")

app = FastAPI(title="Tezla AI Condensation API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for video playback
app.mount("/static/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")
app.mount("/static/processed", StaticFiles(directory=settings.PROCESSED_DIR), name="processed")

# In-memory mock database
DB_PROJECTS = {}

# ==================== Project Endpoints ====================

@app.get("/api/projects", response_model=List[Project])
async def list_projects():
    return list(DB_PROJECTS.values())

@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    if project_id not in DB_PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    return DB_PROJECTS[project_id]

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    content_type = file.content_type or ""
    if not content_type.startswith("video/"):
        logger.warning(f"Rejected upload: content_type={content_type}, filename={file.filename}")
        raise HTTPException(status_code=400, detail=f"File must be a video. Got: {content_type}")

    project_id = f"proj-{uuid.uuid4().hex[:8]}"
    original_path = os.path.join(settings.UPLOAD_DIR, f"{project_id}_{file.filename}")
    logger.info(f"Uploading: {file.filename} -> {original_path}")

    try:
        with open(original_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        file_size = os.path.getsize(original_path)
        logger.info(f"Upload complete: {file.filename} ({file_size} bytes)")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        if os.path.exists(original_path):
            os.remove(original_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    project = Project(
        id=project_id,
        title=file.filename.split('.')[0].replace('_', ' ').capitalize(),
        runtime="00:00",
        runtimeSeconds=0,
        original_file=original_path,
        status='uploaded'
    )
    DB_PROJECTS[project_id] = project
    logger.info(f"Project created: {project_id} - {project.title}")
    return {"message": "Upload successful", "project": project}

@app.get("/api/projects/{project_id}/video")
async def get_project_video(project_id: str, request: Request):
    """Stream the condensed video file with proper HTTP Range support for HTML5 video."""
    from fastapi.responses import StreamingResponse

    video_path = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.mp4")
    if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
        raise HTTPException(status_code=404, detail="Video not ready yet")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
        range_val = range_header.replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1

        def iter_file():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(64 * 1024, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )
    else:
        # No range — return full file
        def iter_full():
            with open(video_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        return StreamingResponse(
            iter_full(),
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        )

@app.post("/api/projects/{project_id}/process")
async def process_project(project_id: str, background_tasks: BackgroundTasks):
    from pipeline.orchestrator import run_pipeline

    if project_id not in DB_PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")

    project = DB_PROJECTS[project_id]
    if project.status == 'processing':
        raise HTTPException(status_code=400, detail="Already processing")

    # Clean old output files to prevent stale video serving
    old_video = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.mp4")
    old_srt = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.srt")
    for old_file in [old_video, old_srt]:
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
                logger.info(f"Cleaned old output: {old_file}")
            except Exception:
                pass

    project.status = 'processing'
    project.progress = 0
    background_tasks.add_task(run_pipeline, project)
    return {"message": "Processing started", "status": "processing"}

@app.post("/api/projects/{project_id}/publish")
async def publish_project(project_id: str):
    if project_id not in DB_PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = DB_PROJECTS[project_id]
    if project.status != 'ready':
        raise HTTPException(status_code=400, detail="Only 'ready' projects can be published")
        
    project.status = 'exported'
    logger.info(f"Project published: {project_id}")
    return {"message": "Project published", "status": "exported"}

# ==================== TMDB Endpoints ====================

@app.get("/api/tmdb/trending")
async def tmdb_trending():
    """Get trending movies from TMDB."""
    if not settings.TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB API key not configured")
    try:
        data = await tmdb.get_trending()
        # Enrich results with image URLs
        for movie in data.get("results", []):
            movie["poster_url"] = tmdb.build_image_url(movie.get("poster_path"), "w500")
            movie["backdrop_url"] = tmdb.build_image_url(movie.get("backdrop_path"), "original")
        return data
    except Exception as e:
        logger.error(f"TMDB trending error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/tmdb/popular")
async def tmdb_popular(page: int = 1):
    """Get popular movies from TMDB."""
    if not settings.TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB API key not configured")
    try:
        data = await tmdb.get_popular(page)
        for movie in data.get("results", []):
            movie["poster_url"] = tmdb.build_image_url(movie.get("poster_path"), "w500")
            movie["backdrop_url"] = tmdb.build_image_url(movie.get("backdrop_path"), "original")
        return data
    except Exception as e:
        logger.error(f"TMDB popular error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/tmdb/search")
async def tmdb_search(q: str = Query(..., min_length=1)):
    """Search movies on TMDB."""
    if not settings.TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB API key not configured")
    try:
        data = await tmdb.search_movies(q)
        for movie in data.get("results", []):
            movie["poster_url"] = tmdb.build_image_url(movie.get("poster_path"), "w500")
            movie["backdrop_url"] = tmdb.build_image_url(movie.get("backdrop_path"), "original")
        return data
    except Exception as e:
        logger.error(f"TMDB search error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/tmdb/movie/{tmdb_id}")
async def tmdb_movie_detail(tmdb_id: int):
    """Get detailed movie info with trailer from TMDB."""
    if not settings.TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB API key not configured")
    try:
        data = await tmdb.get_movie_detail(tmdb_id)
        project_data = tmdb.tmdb_to_project_data(data)
        return {**data, **project_data}
    except Exception as e:
        logger.error(f"TMDB movie detail error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/tmdb/import/{tmdb_id}")
async def tmdb_import_movie(tmdb_id: int):
    """Import a TMDB movie as a Tezla project with AI narrative condensation."""
    if not settings.TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB API key not configured")

    # Check if already imported
    for p in DB_PROJECTS.values():
        if getattr(p, 'tmdb_id', None) == tmdb_id:
            return {"message": "Already imported", "project": p}

    try:
        movie = await tmdb.get_movie_detail(tmdb_id)
        project_data = tmdb.tmdb_to_project_data(movie)
    except Exception as e:
        logger.error(f"TMDB import error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    project_id = f"tmdb-{tmdb_id}"
    runtime_sec = project_data["runtimeSeconds"]
    runtime_min = runtime_sec // 60

    # Generate AI narrative condensation
    from pipeline.condensation import generate_condensation
    genres = [g.strip() for g in project_data["genre"].split(",")]
    all_videos = project_data.get("all_videos", [])

    logger.info(f"Generating AI condensation for: {project_data['title']} ({len(all_videos)} videos available)")
    chapters = generate_condensation(
        title=project_data["title"],
        overview=project_data["overview"],
        genres=genres,
        cast=project_data["cast"],
        runtime_min=runtime_min,
        videos=all_videos,
    )
    logger.info(f"Generated {len(chapters)} chapters for {project_data['title']}")

    # Also generate scene breakdown from chapters
    scenes = []
    for i, ch in enumerate(chapters):
        position = i / max(len(chapters) - 1, 1)
        importance = 0.9 if ch.get("phase") in ("climax", "beginning") else 0.7 if ch.get("phase") == "resolution" else 0.5
        scenes.append({
            "id": ch["id"],
            "start_sec": ch.get("start_min", 0) * 60,
            "end_sec": ch.get("end_min", 2) * 60,
            "status": "keep",
            "importance": importance,
            "confidence": 0.92,
            "narrativePhase": "beginning" if ch.get("phase") == "beginning" else "end" if ch.get("phase") == "resolution" else "middle",
            "label": ch["title"],
            "rationale": ch.get("description", "")[:100] + "...",
            "characters": project_data["cast"][:2] if project_data["cast"] else ["Lead Character"],
            "emotions": ch.get("emotions", ["neutral"]),
            "transcript": "",
            "segments": [],
        })

    # Calculate total reading time
    total_reading = settings.TARGET_BUDGET_SECONDS / 60.0
    condensed_min = int(total_reading)
    condensed_str = f"{condensed_min:02d}:00"

    # Metrics
    avg_conf = 0.92
    compression = round((1 - total_reading / max(runtime_min, 1)) * 100, 1)

    project = Project(
        id=project_id,
        title=project_data["title"],
        runtime=project_data["runtime"],
        runtimeSeconds=runtime_sec,
        condensedDuration=condensed_str,
        condensedSeconds=condensed_min * 60,
        year=project_data["year"],
        genre=project_data["genre"],
        status="ready",
        progress=100,
        confidence=round(avg_conf * 100, 1),
        narrativeRetention=88.5,
        compressionRatio=compression,
        scenes=scenes,
        poster_url=project_data["poster_url"],
        backdrop_url=project_data["backdrop_url"],
        youtube_trailer_key=project_data["youtube_trailer_key"],
        overview=project_data["overview"],
        cast=project_data["cast"],
        tmdb_id=tmdb_id,
        vote_average=project_data["vote_average"],
        condensation=chapters,
        all_videos=all_videos,
    )
    DB_PROJECTS[project_id] = project

    logger.info(f"TMDB import: {project_id} - {project.title} ({len(chapters)} chapters, ~{condensed_min} min read)")
    return {"message": "Import successful", "project": project}

# ==================== YTS / WebTorrent Endpoints ====================

@app.get("/api/yts/search")
async def yts_search_api(q: str = Query(..., min_length=1)):
    """Search for movies on YTS."""
    try:
        movies = yts.search_movies(q)
        return {"results": movies}
    except Exception as e:
        logger.error(f"YTS search error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/yts/download")
async def yts_download_api(request: Request, background_tasks: BackgroundTasks):
    """Start downloading a movie from a YTS torrent/magnet."""
    data = await request.json()
    torrent_url = data.get("torrent_url")
    title = data.get("title", "Unknown YTS Movie")
    
    if not torrent_url:
        raise HTTPException(status_code=400, detail="Missing torrent URL")
        
    project_id = f"yts-{uuid.uuid4().hex[:6]}"
    dest_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    
    # Create an initial pending project
    project = Project(
        id=project_id,
        title=title,
        status="downloading",
        runtime="00:00",
        runtimeSeconds=0
    )
    DB_PROJECTS[project_id] = project
    
    # Run the download in the background
    async def bg_download_and_process():
        try:
            logger.info(f"Starting background torrent download for {title}")
            await yts.download_torrent(torrent_url, dest_dir)
            logger.info(f"Torrent download complete for {title}. Proceeding to pipeline.")
            
            # Find the downloaded video file
            video_extensions = ['.mp4', '.mkv', '.avi']
            downloaded_file = None
            for root, dirs, files in os.walk(dest_dir):
                for file in files:
                    if any(file.endswith(ext) for ext in video_extensions):
                        downloaded_file = os.path.join(root, file)
                        break
                if downloaded_file: break
                
            if not downloaded_file:
                raise Exception("No video file found in downloaded torrent.")
                
            # Update project with actual file and run AI pipeline
            project.original_file = downloaded_file
            project.status = "uploaded"
            
            from pipeline.orchestrator import run_pipeline
            run_pipeline(project)
            
        except Exception as e:
            logger.error(f"YTS Download/Process failed mapping: {e}")
            project.status = "error"
            
    background_tasks.add_task(bg_download_and_process)
    return {"message": "Download started", "project": project}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

