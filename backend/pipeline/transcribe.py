import os
import subprocess
import shutil
from config import settings

def extract_and_transcribe(video_path: str, project_id: str, scenes: list[dict]) -> list[dict]:
    """
    Extracts audio from video, transcribes it using OpenAI Whisper with word-level timestamps,
    and maps the text segments directly to the detected video scenes.
    Falls back to empty transcripts if FFmpeg or Whisper API is unavailable.
    """
    project_processed_dir = os.path.join(settings.PROCESSED_DIR, project_id)
    os.makedirs(project_processed_dir, exist_ok=True)
    audio_path = os.path.join(project_processed_dir, "audio.mp3")

    # 1. Extract Audio (requires FFmpeg)
    audio_extracted = False
    if shutil.which("ffmpeg"):
        print(f"[{project_id}] Extracting audio...")
        try:
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-i", video_path,
                "-vn", "-acodec", "libmp3lame", "-q:a", "2",
                audio_path
            ]
            result = subprocess.run(ffmpeg_cmd, capture_output=True, timeout=300)
            audio_extracted = os.path.exists(audio_path) and os.path.getsize(audio_path) > 0
        except Exception as e:
            print(f"[{project_id}] Audio extraction failed: {e}")
    else:
        print(f"[{project_id}] FFmpeg not found. Skipping audio extraction.")

    # 2. Transcribe via Whisper (requires OpenAI API key + extracted audio)
    if not audio_extracted or not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "TODO":
        if not audio_extracted:
            print(f"[{project_id}] No audio file. Using empty transcripts.")
        else:
            print(f"[{project_id}] No OpenAI API Key. Using empty transcripts.")
        for scene in scenes:
            scene["transcript"] = ""
            scene["segments"] = []
        return scenes

    print(f"[{project_id}] Transcribing audio with Whisper...")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"]
            )

        # Prefer word-level timestamps for precise boundary detection
        words = getattr(transcript, 'words', None) or []
        segments = getattr(transcript, 'segments', None) or []

        if words:
            print(f"[{project_id}] Transcription complete. {len(words)} words, {len(segments)} segments.")
        else:
            print(f"[{project_id}] Transcription complete. {len(segments)} segments (no word-level data).")

    except Exception as e:
        print(f"[{project_id}] Whisper API error: {e}")
        for scene in scenes:
            scene["transcript"] = ""
            scene["segments"] = []
        return scenes

    # 3. Align segments to scenes using segment-level data
    for scene in scenes:
        scene["transcript"] = ""
        scene["segments"] = []

    for seg in segments:
        seg_start = seg.start
        seg_end = seg.end
        text = seg.text.strip()

        # Use midpoint to assign segment to scene
        midpoint = seg_start + (seg_end - seg_start) / 2

        for scene in scenes:
            if scene["start_sec"] <= midpoint <= scene["end_sec"]:
                scene["transcript"] += text + " "
                scene["segments"].append({
                    "text": text,
                    "start": seg_start,
                    "end": seg_end
                })
                break

    # 4. Also store word-level data on scenes (for dialogue boundary adjustment)
    if words:
        for scene in scenes:
            scene["words"] = []

        for word_data in words:
            w_start = word_data.start
            w_end = word_data.end
            w_text = word_data.word.strip()

            midpoint = w_start + (w_end - w_start) / 2

            for scene in scenes:
                if scene["start_sec"] <= midpoint <= scene["end_sec"]:
                    scene["words"].append({
                        "word": w_text,
                        "start": w_start,
                        "end": w_end
                    })
                    break

    for scene in scenes:
        scene["transcript"] = scene["transcript"].strip()

    return scenes
