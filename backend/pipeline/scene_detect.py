import subprocess
import re
import os
import shutil
from config import settings

MIN_SCENE_DURATION = 3.0   # Minimum scene length in seconds
MAX_SCENE_DURATION = 30.0  # Maximum scene length before splitting


def _ffmpeg_available():
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _get_video_duration(video_path: str) -> float:
    """Get video duration via ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def _detect_scene_changes(video_path: str, project_id: str, threshold: float = 0.3) -> list[float]:
    """
    Detect scene change timestamps using ffmpeg showinfo filter.
    This method works reliably on Windows (unlike lavfi movie= syntax).
    Returns list of timestamps where scene changes occur.
    """
    scene_times = []

    # Method: Use ffmpeg with select+showinfo filter
    # This writes scene change info to stderr which we parse
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"select='gt(scene,{threshold})',showinfo",
        "-vsync", "vfr",
        "-f", "null",
        "-"
    ]

    try:
        print(f"[{project_id}] Running scene detection with threshold={threshold}...")
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )

        # Parse stderr for pts_time values from showinfo filter
        for line in result.stderr.splitlines():
            # showinfo outputs lines like: [Parsed_showinfo_1] ... pts_time:12.345
            match = re.search(r"pts_time:\s*([0-9.]+)", line)
            if match:
                t = float(match.group(1))
                if t > 0:  # Skip 0.0 (first frame)
                    scene_times.append(t)

        print(f"[{project_id}] Found {len(scene_times)} scene changes via showinfo filter.")
    except subprocess.TimeoutExpired:
        print(f"[{project_id}] Scene detection timed out.")
    except Exception as e:
        print(f"[{project_id}] Scene detection error: {e}")

    return scene_times


def _merge_short_scenes(scenes: list[dict], min_duration: float = MIN_SCENE_DURATION) -> list[dict]:
    """Merge scenes shorter than min_duration with their neighbors."""
    if not scenes:
        return scenes

    merged = [scenes[0].copy()]
    for scene in scenes[1:]:
        duration = scene['end_sec'] - scene['start_sec']
        prev_duration = merged[-1]['end_sec'] - merged[-1]['start_sec']

        if duration < min_duration:
            merged[-1]['end_sec'] = scene['end_sec']
        elif prev_duration < min_duration:
            merged[-1]['end_sec'] = scene['end_sec']
        else:
            merged.append(scene.copy())

    for i, s in enumerate(merged):
        s['id'] = f"s{i:03d}"
    return merged


def _split_long_scenes(scenes: list[dict], max_duration: float = MAX_SCENE_DURATION) -> list[dict]:
    """Split scenes longer than max_duration into roughly equal parts."""
    result = []
    for scene in scenes:
        duration = scene['end_sec'] - scene['start_sec']
        if duration > max_duration:
            num_parts = max(2, int(duration / 15))
            part_len = duration / num_parts
            for p in range(num_parts):
                new_scene = scene.copy()
                new_scene['start_sec'] = round(scene['start_sec'] + p * part_len, 2)
                new_scene['end_sec'] = round(scene['start_sec'] + (p + 1) * part_len, 2)
                result.append(new_scene)
        else:
            result.append(scene.copy())

    for i, s in enumerate(result):
        s['id'] = f"s{i:03d}"
    return result


def _generate_fallback_scenes(video_path: str, project_id: str) -> list[dict]:
    """Generate evenly-spaced scenes when scene detection fails."""
    duration = _get_video_duration(video_path)
    if duration <= 0:
        duration = 60.0

    scene_len = max(10.0, duration / max(int(duration / 10), 1))
    scenes = []
    t = 0.0
    idx = 0
    while t < duration:
        end = min(t + scene_len, duration)
        if end - t < 0.5:
            break
        scenes.append({
            "id": f"s{idx:03d}",
            "start_sec": round(t, 2),
            "end_sec": round(end, 2),
            "keyframe_path": ""
        })
        idx += 1
        t = end

    print(f"[{project_id}] Fallback: generated {len(scenes)} scenes from {duration:.1f}s video")
    return scenes


def detect_scenes(video_path: str, project_id: str) -> list[dict]:
    """
    Detect scene boundaries, extract keyframes, and post-process.
    Uses ffmpeg showinfo filter (Windows-compatible) instead of lavfi movie= syntax.
    """
    if not _ffmpeg_available():
        print(f"[{project_id}] FFmpeg not found. Using fallback.")
        return _generate_fallback_scenes(video_path, project_id)

    print(f"[{project_id}] Starting scene detection...")

    total_duration = _get_video_duration(video_path)
    if total_duration <= 0:
        print(f"[{project_id}] Could not determine duration. Using fallback.")
        return _generate_fallback_scenes(video_path, project_id)

    # Detect scene change timestamps
    scene_change_times = _detect_scene_changes(video_path, project_id)

    # Build scene intervals: [0, t1, t2, ..., total_duration]
    boundaries = [0.0] + scene_change_times + [total_duration]
    # Remove duplicates and sort
    boundaries = sorted(set(boundaries))

    if len(boundaries) <= 2:
        print(f"[{project_id}] No scene changes found. Using fallback.")
        return _generate_fallback_scenes(video_path, project_id)

    # Create scenes from intervals
    scenes = []
    project_processed_dir = os.path.join(settings.PROCESSED_DIR, project_id)
    os.makedirs(project_processed_dir, exist_ok=True)

    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]

        if end - start < 0.5:
            continue

        # Extract keyframe at midpoint
        midpoint = start + (end - start) / 2
        keyframe_path = os.path.join(project_processed_dir, f"scene_{i:03d}.jpg")

        try:
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-ss", str(midpoint),
                "-i", video_path,
                "-frames:v", "1", "-q:v", "2",
                keyframe_path
            ]
            subprocess.run(
                ffmpeg_cmd, capture_output=True, timeout=30,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
        except Exception:
            keyframe_path = ""

        scenes.append({
            "id": f"s{i:03d}",
            "start_sec": round(start, 2),
            "end_sec": round(end, 2),
            "keyframe_path": keyframe_path
        })

    if not scenes:
        return _generate_fallback_scenes(video_path, project_id)

    # Post-process
    original_count = len(scenes)
    scenes = _merge_short_scenes(scenes)
    scenes = _split_long_scenes(scenes)

    print(f"[{project_id}] Detected {original_count} raw scenes → {len(scenes)} after merge/split.")
    return scenes
