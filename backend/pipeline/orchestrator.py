import os
from datetime import datetime
from config import settings
from pipeline.scene_detect import detect_scenes
from pipeline.transcribe import extract_and_transcribe
from pipeline.analyze import score_scenes
from pipeline.select import select_scenes
from pipeline.render import render_condensed_video

def run_pipeline(project):
    """
    Main orchestration function that runs the full AI processing pipeline.
    Runs in a background thread.
    """
    project_id = project.id
    original_video = project.original_file

    try:
        # Step 1: Detect Scenes (20%)
        print(f"--- Starting Pipeline for {project_id} ---")
        project.progress = 10
        scenes_data = detect_scenes(original_video, project_id)
        project.progress = 20

        # Update runtime from detected scenes
        total_sec = scenes_data[-1]['end_sec'] if scenes_data else 0.0
        project.runtimeSeconds = int(total_sec)
        m, s = divmod(int(total_sec), 60)
        h, m = divmod(m, 60)
        project.runtime = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"
        print(f"[{project_id}] Video duration: {project.runtime} ({len(scenes_data)} scenes)")

        # Step 2: Extract Audio & Transcribe (40%)
        project.progress = 30
        scenes_data = extract_and_transcribe(original_video, project_id, scenes_data)
        project.progress = 50

        # Step 3: Analyze & Score via AI (60%)
        scenes_data = score_scenes(project_id, scenes_data, total_sec)
        project.progress = 65

        # Calculate summary metrics
        avg_confidence = sum([s.get('confidence', 0) for s in scenes_data]) / max(len(scenes_data), 1)
        project.confidence = round(avg_confidence * 100, 1)

        # Step 4: Budget Allocation & Scene Selection (80%)
        scenes_data = select_scenes(project_id, scenes_data)
        project.progress = 80

        # Map scene data to project
        project.scenes = scenes_data

        # Step 5: Render Output Video (100%)
        render_condensed_video(original_video, project_id, scenes_data)
        project.progress = 95

        # Calculate final metrics
        kept_seconds = sum([s['end_sec'] - s['start_sec'] for s in scenes_data if s.get('status') == 'keep'])
        project.condensedSeconds = int(kept_seconds)
        cm, cs = divmod(int(kept_seconds), 60)
        ch, cm = divmod(cm, 60)
        project.condensedDuration = f"{ch:02d}:{cm:02d}:{cs:02d}" if ch > 0 else f"{cm:02d}:{cs:02d}"

        if total_sec > 0:
            project.compressionRatio = round((total_sec - kept_seconds) / total_sec * 100, 1)

        project.narrativeRetention = round(project.confidence * 0.9 + 5, 1)

        project.output_file = os.path.join(settings.OUTPUT_DIR, f"{project_id}_condensed.mp4")
        project.status = "ready"
        project.progress = 100
        project.processedAt = datetime.now().isoformat()

        print(f"--- Pipeline COMPLETE for {project_id} ---")
        print(f"    Duration: {project.runtime} -> {project.condensedDuration}")
        print(f"    Scenes: {len(scenes_data)} total, {len([s for s in scenes_data if s.get('status')=='keep'])} kept")
        print(f"    Confidence: {project.confidence}%")

    except Exception as e:
        print(f"!!! Pipeline FAILED for {project_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        project.status = "error"
        project.progress = 0

