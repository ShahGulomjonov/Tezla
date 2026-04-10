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
async def tmdb_import_movie(tmdb_id: int, background_tasks: BackgroundTasks):
    """Import a TMDB movie: fetch metadata, search Rutor for torrent, download, and run AI pipeline."""
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

    # Create project with 'downloading' status
    project = Project(
        id=project_id,
        title=project_data["title"],
        runtime=project_data["runtime"],
        runtimeSeconds=runtime_sec,
        year=project_data["year"],
        genre=project_data["genre"],
        status="downloading",
        progress=0,
        scenes=[],
        poster_url=project_data["poster_url"],
        backdrop_url=project_data["backdrop_url"],
        youtube_trailer_key=project_data["youtube_trailer_key"],
        overview=project_data["overview"],
        cast=project_data["cast"],
        tmdb_id=tmdb_id,
        vote_average=project_data["vote_average"],
    )
    DB_PROJECTS[project_id] = project

    # Background: search Rutor -> download torrent -> run AI pipeline
    background_tasks.add_task(_bg_download_and_process, project, project_id, project_data["title"], project_data.get("year"))

    logger.info(f"TMDB import started: {project_id} - {project.title}")
    return {"message": "Import started — downloading from Rutor.info", "project": project}


# ==================== Shared Torrent Download Helper ====================

def _run_torrent_download(project, project_id: str, magnet: str, dest_dir: str) -> str | None:
    """
    Download a torrent using webtorrent, track progress via file size monitoring.
    Returns the path to the downloaded video file, or None on failure.
    
    NOTE: We do NOT parse webtorrent's stdout for progress — it buffers/disables
    progress bars when stdout is piped (non-TTY). Instead, we monitor the 
    download directory for growing files.
    """
    import subprocess
    import time
    import threading

    os.makedirs(dest_dir, exist_ok=True)

    logger.info(f"[{project_id}] Starting webtorrent download...")
    cmd = f'webtorrent download "{magnet}" --out "{dest_dir}"'

    # Run webtorrent in a thread so we can monitor file sizes concurrently
    process_result = {"returncode": None, "finished": False}

    def run_webtorrent():
        try:
            result = subprocess.run(
                cmd, shell=True,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=7200,  # 2 hour max
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            process_result["returncode"] = result.returncode
        except subprocess.TimeoutExpired:
            logger.error(f"[{project_id}] Webtorrent timed out (2h)")
            process_result["returncode"] = -1
        except Exception as e:
            logger.error(f"[{project_id}] Webtorrent error: {e}")
            process_result["returncode"] = -1
        finally:
            process_result["finished"] = True

    dl_thread = threading.Thread(target=run_webtorrent, daemon=True)
    dl_thread.start()

    # Monitor download progress by watching file sizes in dest_dir
    stall_timeout = 600  # 10 minutes without growth = stalled
    last_total_size = 0
    last_growth_time = time.time()
    poll_interval = 3  # Check every 3 seconds

    while not process_result["finished"]:
        time.sleep(poll_interval)

        # Calculate total size of all files in dest_dir
        total_size = 0
        for root, dirs, files in os.walk(dest_dir):
            for f in files:
                try:
                    total_size += os.path.getsize(os.path.join(root, f))
                except OSError:
                    pass

        if total_size > last_total_size:
            last_total_size = total_size
            last_growth_time = time.time()

            # Estimate progress: assume movie is roughly 1-4 GB
            # Map file size growth to 10-70% project progress
            size_mb = total_size / (1024 * 1024)
            # Rough estimate: 700MB file = ~50%, 1.5GB = ~70%
            estimated_pct = min(70, int(10 + (size_mb / 20)))
            project.progress = estimated_pct

            if int(size_mb) % 100 == 0 and size_mb > 0:
                logger.info(f"[{project_id}] Downloaded: {size_mb:.0f} MB")
        else:
            # Check stall — no file growth
            stall_duration = time.time() - last_growth_time
            if stall_duration > stall_timeout and last_total_size > 0:
                logger.warning(f"[{project_id}] Download stalled for {stall_timeout}s. Aborting.")
                project.status = "error"
                project.progress = 0
                return None

    dl_thread.join(timeout=10)

    exit_code = process_result["returncode"]
    logger.info(f"[{project_id}] Webtorrent finished (exit code: {exit_code})")

    project.progress = 72

    # Find the largest video file
    video_extensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v']
    downloaded_file = None
    largest_size = 0
    for root, dirs, files in os.walk(dest_dir):
        for file in files:
            fpath = os.path.join(root, file)
            if any(file.lower().endswith(ext) for ext in video_extensions):
                try:
                    fsize = os.path.getsize(fpath)
                    if fsize > largest_size:
                        largest_size = fsize
                        downloaded_file = fpath
                except OSError:
                    pass

    if not downloaded_file:
        logger.error(f"[{project_id}] No video file found after download")
        project.status = "error"
        project.progress = 0
        return None

    # Validate file size
    file_size_mb = largest_size / (1024 * 1024)
    if file_size_mb < 50:
        logger.error(f"[{project_id}] File too small: {file_size_mb:.1f}MB. Likely incomplete.")
        project.status = "error"
        project.progress = 0
        return None

    logger.info(f"[{project_id}] Video downloaded: {downloaded_file} ({file_size_mb:.0f} MB)")
    return downloaded_file


def _bg_download_and_process(project, project_id: str, title: str, year=None):
    """Background task: search Rutor -> download -> AI pipeline."""
    import rutor
    from pipeline.orchestrator import run_pipeline

    try:
        logger.info(f"[{project_id}] Searching Rutor for: {title} ({year})")
        project.progress = 5
        torrent = rutor.find_best_movie_torrent(title, year)

        if not torrent:
            logger.error(f"[{project_id}] No torrent found on Rutor")
            project.status = "error"
            project.progress = 0
            return

        logger.info(f"[{project_id}] Found: {torrent['title'][:60]} ({torrent['size']})")
        project.progress = 8

        dest_dir = os.path.join(settings.UPLOAD_DIR, project_id)
        downloaded_file = _run_torrent_download(project, project_id, torrent["magnet"], dest_dir)

        if not downloaded_file:
            return  # Status already set to error inside helper

        project.original_file = downloaded_file
        project.status = "processing"
        project.progress = 75
        run_pipeline(project)

    except Exception as e:
        logger.error(f"[{project_id}] Download/Process failed: {e}")
        import traceback
        traceback.print_exc()
        project.status = "error"
        project.progress = 0


@app.post("/api/tmdb/retry/{project_id}")
async def tmdb_retry_project(project_id: str, background_tasks: BackgroundTasks):
    """Retry downloading and processing a failed TMDB project from scratch."""
    if project_id not in DB_PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")

    project = DB_PROJECTS[project_id]
    if project.status not in ("error", "ready"):
        raise HTTPException(status_code=400, detail=f"Cannot retry '{project.status}' state")

    # Clean old files
    import shutil
    for f in [
        os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.mp4"),
        os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.srt"),
    ]:
        if os.path.exists(f):
            try: os.remove(f)
            except: pass

    dest_dir = os.path.join(settings.UPLOAD_DIR, project_id)
    if os.path.exists(dest_dir):
        try: shutil.rmtree(dest_dir, ignore_errors=True)
        except: pass

    # Reset project state
    project.status = "downloading"
    project.progress = 0
    project.original_file = ""
    project.output_file = ""
    project.scenes = []
    project.condensedDuration = ""
    project.condensedSeconds = 0
    project.compressionRatio = 0

    background_tasks.add_task(
        _bg_download_and_process,
        project, project_id,
        project.title, getattr(project, 'year', None)
    )
    return {"message": "Retry started", "project": project}

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

