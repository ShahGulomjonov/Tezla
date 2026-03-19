import os
import subprocess
import shutil
from config import settings


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds into SRT timestamp HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"


def render_condensed_video(video_path: str, project_id: str, scenes: list[dict]):
    """
    Concatenates the 'keep' scenes into the final condensed video.
    Uses frame-accurate seeking and audio sync correction.
    Uses concat demuxer (file list) instead of concat protocol for Windows compatibility.
    """
    print(f"[{project_id}] Rendering condensed video...")

    kept_scenes = sorted(
        [s for s in scenes if s.get('status') == 'keep'],
        key=lambda x: x['start_sec']
    )

    if not kept_scenes:
        print(f"[{project_id}] No scenes selected to keep!")
        return

    project_processed_dir = os.path.join(settings.PROCESSED_DIR, project_id)
    os.makedirs(project_processed_dir, exist_ok=True)

    output_video_path = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.mp4")
    output_srt_path = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.srt")

    # ==================== 1. Render Video ====================
    if shutil.which("ffmpeg"):
        try:
            temp_dir = os.path.join(project_processed_dir, "segments")
            os.makedirs(temp_dir, exist_ok=True)

            # Step 1: Extract each scene as individual MPEG-TS segment
            segment_files = []
            for i, scene in enumerate(kept_scenes):
                seg_path = os.path.join(temp_dir, f"seg_{i:04d}.ts")
                segment_files.append(seg_path)

                start = scene['start_sec']
                duration = scene['end_sec'] - scene['start_sec']

                cmd_extract = [
                    "ffmpeg", "-y",
                    "-ss", str(start),          # Put -ss BEFORE -i for fast extraction
                    "-i", video_path,
                    "-t", str(duration),        # Use -t (duration) instead of -to
                    "-c:v", "libx264",
                    "-crf", "23",
                    "-preset", "ultrafast",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-af", "aresample=async=1",
                    "-vsync", "cfr",
                    "-avoid_negative_ts", "make_zero",
                    "-f", "mpegts",
                    seg_path
                ]

                print(f"[{project_id}] Extracting segment {i+1}/{len(kept_scenes)}: "
                      f"{start:.1f}s +{duration:.1f}s")

                result = subprocess.run(
                    cmd_extract, capture_output=True, text=True, timeout=1200,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
                )

                if not os.path.exists(seg_path) or os.path.getsize(seg_path) == 0:
                    print(f"[{project_id}] Warning: segment {i} failed")
                    if result.stderr:
                        # Show last 200 chars of error
                        print(f"[{project_id}] FFmpeg: {result.stderr[-200:]}")

            valid_segments = [s for s in segment_files
                             if os.path.exists(s) and os.path.getsize(s) > 0]
            print(f"[{project_id}] Extracted {len(valid_segments)}/{len(kept_scenes)} segments")

            if not valid_segments:
                print(f"[{project_id}] No valid segments - skipping render")
            else:
                # Step 2: Concatenate using concat DEMUXER (not protocol)
                # This is Windows-compatible — writes a file list and uses -f concat
                concat_list_path = os.path.join(temp_dir, "concat_list.txt")
                with open(concat_list_path, "w", encoding="utf-8") as f:
                    for seg in valid_segments:
                        # Use forward slashes and escape single quotes for FFmpeg
                        safe_path = seg.replace("\\", "/").replace("'", "'\\''")
                        f.write(f"file '{safe_path}'\n")

                cmd_concat = [
                    "ffmpeg", "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", concat_list_path,
                    "-c", "copy",
                    "-movflags", "+faststart",
                    "-f", "mp4",
                    output_video_path
                ]

                print(f"[{project_id}] Concatenating {len(valid_segments)} segments...")
                result = subprocess.run(
                    cmd_concat, capture_output=True, text=True, timeout=1200,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
                )

                if os.path.exists(output_video_path) and os.path.getsize(output_video_path) > 0:
                    size_mb = os.path.getsize(output_video_path) / (1024 * 1024)
                    print(f"[{project_id}] ✓ Video rendered: {output_video_path} ({size_mb:.1f} MB)")
                else:
                    print(f"[{project_id}] ✗ FFmpeg concat FAILED — no output file created")
                    if hasattr(result, 'stderr') and result.stderr:
                        print(f"[{project_id}] FFmpeg stderr: {result.stderr}")
                    if hasattr(result, 'stdout') and result.stdout:
                        print(f"[{project_id}] FFmpeg stdout: {result.stdout}")

            # Cleanup temp segments ONLY IF successful
            if os.path.exists(output_video_path) and os.path.getsize(output_video_path) > 0:
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception:
                    pass

        except subprocess.TimeoutExpired:
            print(f"[{project_id}] Warning: Video rendering timed out")
        except Exception as e:
            print(f"[{project_id}] Warning: Video rendering failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[{project_id}] FFmpeg not available. Skipping video rendering.")

    # ==================== 2. Generate Subtitles (SRT) ====================
    print(f"[{project_id}] Generating subtitles...")
    try:
        with open(output_srt_path, "w", encoding="utf-8") as f:
            sub_index = 1
            current_playback_time = 0.0

            for scene in kept_scenes:
                segments = scene.get('segments', [])
                scene_duration = scene['end_sec'] - scene['start_sec']

                for seg in segments:
                    rel_start = current_playback_time + (seg['start'] - scene['start_sec'])
                    rel_end = current_playback_time + (seg['end'] - scene['start_sec'])

                    rel_start = max(current_playback_time, rel_start)
                    rel_end = min(current_playback_time + scene_duration, rel_end)

                    if rel_start < rel_end:
                        f.write(f"{sub_index}\n")
                        f.write(f"{format_timestamp_srt(rel_start)} --> {format_timestamp_srt(rel_end)}\n")
                        f.write(f"{seg['text'].strip()}\n\n")
                        sub_index += 1

                current_playback_time += scene_duration
    except Exception as e:
        print(f"[{project_id}] Warning: Subtitle generation failed: {e}")

    print(f"[{project_id}] Rendering complete.")
