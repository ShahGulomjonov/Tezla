from config import settings

# Maximum seconds to extend a scene boundary for dialogue completion
MAX_DIALOGUE_EXTENSION = 3.0
# Gap threshold to merge adjacent kept scenes
MERGE_GAP_THRESHOLD = 2.0
BRIDGE_GAP_MAX = 12.0


def _adjust_boundaries_for_dialogue(scenes: list[dict]):
    """
    Adjust scene boundaries so dialogue segments are not cut mid-sentence.
    
    Strategy:
    1. If word-level data is available, find the nearest sentence-ending word
       (ending with . ! ?) after the scene boundary and extend to it.
    2. Otherwise, use segment-level data to extend to the end of the last segment.
    3. Also pull start back if dialogue begins before the scene start.
    """
    SENTENCE_END_CHARS = {'.', '!', '?'}

    for scene in scenes:
        words = scene.get('words', [])
        segments = scene.get('segments', [])

        if words:
            # Word-level: find if any words near scene end haven't been included
            # Look for words that start within scene but extend past it,
            # or words just past scene end that complete a sentence
            scene_end = scene['end_sec']
            words_after_end = [w for w in words if w['start'] >= scene_end - 0.5 and w['start'] <= scene_end + MAX_DIALOGUE_EXTENSION]

            for w in words_after_end:
                # Check if word ends a sentence
                if w['word'] and w['word'].rstrip()[-1] in SENTENCE_END_CHARS:
                    new_end = min(w['end'], scene['end_sec'] + MAX_DIALOGUE_EXTENSION)
                    if new_end > scene['end_sec']:
                        scene['end_sec'] = round(new_end, 2)
                    break
                # If not sentence end but within extension range, keep looking
                if w['end'] - scene_end > MAX_DIALOGUE_EXTENSION:
                    break

            # Also check scene start
            scene_start = scene['start_sec']
            words_before_start = [w for w in words if w['end'] > scene_start - MAX_DIALOGUE_EXTENSION and w['end'] <= scene_start + 0.5]
            if words_before_start:
                # Find the start of the sentence containing these words
                first_word = words_before_start[0]
                if first_word['start'] < scene_start:
                    scene['start_sec'] = round(max(0, first_word['start']), 2)

        elif segments:
            # Segment-level fallback
            last_seg = segments[-1]
            if last_seg['end'] > scene['end_sec']:
                extension = min(last_seg['end'] - scene['end_sec'], MAX_DIALOGUE_EXTENSION)
                scene['end_sec'] = round(scene['end_sec'] + extension, 2)

            first_seg = segments[0]
            if first_seg['start'] < scene['start_sec']:
                extension = min(scene['start_sec'] - first_seg['start'], MAX_DIALOGUE_EXTENSION)
                scene['start_sec'] = round(max(0, scene['start_sec'] - extension), 2)

    return scenes


def _merge_adjacent_scenes(scenes: list[dict]):
    """
    Merge adjacent 'keep' scenes when they have tiny gaps (< MERGE_GAP_THRESHOLD).
    This prevents unnecessary cuts and mid-dialogue splits.
    """
    kept = sorted([s for s in scenes if s.get('status') == 'keep'], key=lambda x: x['start_sec'])
    cut = [s for s in scenes if s.get('status') != 'keep']

    if len(kept) < 2:
        return scenes

    merged = [kept[0].copy()]
    for cur in kept[1:]:
        gap = cur['start_sec'] - merged[-1]['end_sec']
        if gap <= MERGE_GAP_THRESHOLD:
            # Merge: extend previous scene to cover current
            merged[-1]['end_sec'] = cur['end_sec']
            # Combine transcripts
            prev_segs = merged[-1].get('segments', [])
            cur_segs = cur.get('segments', [])
            merged[-1]['segments'] = prev_segs + cur_segs
            merged[-1]['transcript'] = (
                merged[-1].get('transcript', '') + ' ' + cur.get('transcript', '')
            ).strip()
            # Keep higher importance
            merged[-1]['importance'] = max(
                merged[-1].get('importance', 0), cur.get('importance', 0)
            )
        else:
            merged.append(cur.copy())

    # Rebuild: merged keeps + original cuts
    result = merged + cut
    result.sort(key=lambda x: x['start_sec'])

    # Re-index
    for i, s in enumerate(result):
        s['id'] = f"s{i:03d}"

    return result


def _promote_bridge_scenes(scenes: list[dict]):
    """
    Promote tiny in-between scenes as continuity bridges when there is a
    narrative gap between kept scenes.
    """
    chronological = sorted(scenes, key=lambda x: x['start_sec'])
    kept = [s for s in chronological if s.get('status') == 'keep']

    if len(kept) < 2:
        return scenes

    for i in range(len(kept) - 1):
        left = kept[i]
        right = kept[i + 1]
        gap = right['start_sec'] - left['end_sec']

        # Ignore overlaps/tiny gaps and very large jumps.
        if gap <= MERGE_GAP_THRESHOLD or gap > BRIDGE_GAP_MAX:
            continue

        between = [
            s for s in chronological
            if s.get('status') != 'keep'
            and s['start_sec'] >= left['end_sec']
            and s['end_sec'] <= right['start_sec']
        ]
        if not between:
            continue

        # Prefer dialogue-bearing bridge scene; else fallback to longest.
        dialogue_candidates = [s for s in between if len((s.get('transcript') or '').strip()) >= 25]
        candidate = dialogue_candidates[0] if dialogue_candidates else max(
            between, key=lambda x: x['end_sec'] - x['start_sec']
        )

        candidate['status'] = 'keep'
        candidate['is_bridge'] = True
        candidate['importance'] = max(candidate.get('importance', 0.0), 0.65)
        previous = candidate.get('rationale', '')
        candidate['rationale'] = f"[Bridge for continuity] {previous}".strip()

    return scenes


def _enforce_budget_with_priority(scenes: list[dict], target_duration_sec: int):
    """
    Enforce duration budget while preserving continuity bridges and 
    respecting the Pareto 80/20 strategic/action split.
    Action scenes are aggressively cut down to 0 if we are over budget,
    before ever touching the Strategic core.
    """
    retained = [s for s in scenes if s.get('status') == 'keep']
    total_used = sum(s['end_sec'] - s['start_sec'] for s in retained)
    
    if total_used <= target_duration_sec:
        return scenes

    # Pareto 80/20 Target Split
    # Strategic: 80% of budget, Action: 20% of budget
    STRATEGIC_BUDGET = target_duration_sec * 0.8
    ACTION_BUDGET = target_duration_sec * 0.2
    
    film_duration = max((s.get('end_sec', 0.0) for s in scenes), default=1.0)

    # 1. First, aggressively trim action scenes if they exceed the 20% budget
    action_scenes = [s for s in retained if s.get('scene_type') != 'strategic']
    act_used = sum(s['end_sec'] - s['start_sec'] for s in action_scenes)
    
    print(f"Initial retained: {total_used}s. Strategic budget: {STRATEGIC_BUDGET}s, Action budget: {ACTION_BUDGET}s")
    print(f"Action used: {act_used}s")

    if act_used > ACTION_BUDGET:
        # Sort action scenes by importance (ascending) to cut
        action_scenes.sort(key=lambda x: (x.get('is_bridge', False), float(x.get('importance', 0))))
        for s in action_scenes:
            if act_used <= ACTION_BUDGET:
                break
            s['status'] = 'cut'
            act_used -= (s['end_sec'] - s['start_sec'])
            total_used -= (s['end_sec'] - s['start_sec'])

    # 2. If we are STILL over budget, continue cutting Action scenes down to 0 before touching Strategic!
    if total_used > target_duration_sec:
        remaining_action = [s for s in scenes if s.get('status') == 'keep' and s.get('scene_type') != 'strategic']
        remaining_action.sort(key=lambda x: (x.get('is_bridge', False), float(x.get('importance', 0))))
        for s in remaining_action:
            if total_used <= target_duration_sec:
                break
            s['status'] = 'cut'
            total_used -= (s['end_sec'] - s['start_sec'])

    # 3. If still over total budget, trim strategic scenes
    if total_used > target_duration_sec:
        def strat_rank(s: dict):
            is_bridge = 1 if s.get('is_bridge') else 0
            pos = s.get('start_sec', 0) / max(film_duration, 1)
            is_climax = 1 if pos >= 0.85 else 0
            importance = float(s.get('importance', 0))
            return (is_bridge, is_climax, importance)

        strategic_scenes = [s for s in scenes if s.get('status') == 'keep' and s.get('scene_type') == 'strategic']
        strategic_scenes.sort(key=strat_rank)
        
        for s in strategic_scenes:
            if total_used <= target_duration_sec:
                break
            # Don't drop bridge unless absolutely necessary
            if s.get('is_bridge') and total_used - (s['end_sec'] - s['start_sec']) > target_duration_sec * 0.9:
                 continue
            
            s['status'] = 'cut'
            total_used -= (s['end_sec'] - s['start_sec'])
            
    print(f"Total used after budget cuts: {total_used}s")

    # 4. Last resort: aggressive trim of anything left till budget met
    if total_used > target_duration_sec:
        remaining = sorted([s for s in scenes if s.get('status') == 'keep'], key=lambda x: float(x.get('importance', 0)))
        for s in remaining:
            if total_used <= target_duration_sec:
                break
            s['status'] = 'cut'
            total_used -= (s['end_sec'] - s['start_sec'])

    return scenes


def select_scenes(project_id: str, scenes: list[dict], target_duration_sec: int = settings.TARGET_BUDGET_SECONDS):
    """
    Selects scenes based on AI JSON Schema selections.
    Enforces that the output is as close to target_duration_sec as possible.
    If AI selects too few scenes, we FILL UP to the target.
    If AI selects too many, we TRIM DOWN to the target.
    """
    print(f"[{project_id}] Selecting scenes for {target_duration_sec}s target based on AI JSON Schema...")

    # Set default status if missing
    for scene in scenes:
        if 'status' not in scene:
            scene['status'] = 'cut'

    retained_scenes = [s for s in scenes if s.get('status') == 'keep']
    
    # --- FALLBACK: If AI returned zero scenes, select by importance ---
    if not retained_scenes:
        print(f"[{project_id}] AI output was empty! Falling back to importance-based selection...")
        sorted_by_importance = sorted(scenes, key=lambda x: x.get('importance', 0), reverse=True)
        total_used = 0.0
        for scene in sorted_by_importance:
            duration = scene['end_sec'] - scene['start_sec']
            if total_used + duration <= target_duration_sec + 300:
                scene['status'] = 'keep'
                total_used += duration
                retained_scenes.append(scene)

    total_used = sum(s['end_sec'] - s['start_sec'] for s in retained_scenes)
    print(f"[{project_id}] AI initially selected {len(retained_scenes)} scenes, total: {total_used:.1f}s")

    # ==========================================================
    # CRITICAL: FILL UP to target if AI selected too few scenes
    # ==========================================================
    min_threshold = target_duration_sec * 0.60  # At least 60% of target (15 min)
    
    if total_used < min_threshold:
        print(f"[{project_id}] AI selected only {total_used:.0f}s (< {min_threshold:.0f}s minimum). FILLING UP to {target_duration_sec}s...")
        
        # Get unselected scenes, sorted by importance (highest first)
        unselected = sorted(
            [s for s in scenes if s.get('status') != 'keep'],
            key=lambda x: x.get('importance', 0),
            reverse=True
        )
        
        for scene in unselected:
            if total_used >= target_duration_sec:
                break
            duration = scene['end_sec'] - scene['start_sec']
            if duration < 0.5:
                continue  # Skip tiny fragments
            scene['status'] = 'keep'
            total_used += duration
            retained_scenes.append(scene)
        
        print(f"[{project_id}] After fill-up: {len(retained_scenes)} scenes, total: {total_used:.1f}s")

    # ==========================================================
    # TRIM DOWN if over budget
    # ==========================================================
    if total_used > target_duration_sec:
        print(f"[{project_id}] Over budget ({total_used:.0f}s > {target_duration_sec}s). Trimming...")
        retained_scenes.sort(key=lambda x: x.get('importance', 0))
        
        while total_used > target_duration_sec and retained_scenes:
            dropped = retained_scenes.pop(0)
            dropped['status'] = 'cut'
            total_used -= (dropped['end_sec'] - dropped['start_sec'])

    # Adjust boundaries so dialogue segments are not cut mid-sentence
    scenes = _adjust_boundaries_for_dialogue(scenes)

    # Merge adjacent kept scenes with tiny gaps
    scenes = _merge_adjacent_scenes(scenes)

    # Promote bridge scenes for smoother narrative continuity
    scenes = _promote_bridge_scenes(scenes)

    # Re-enforce budget after continuity adjustments
    scenes = _enforce_budget_with_priority(scenes, target_duration_sec)

    # ==========================================================
    # FINAL SAFETY: If still under 60% of target, force-fill again
    # ==========================================================
    final_kept = sum(s['end_sec'] - s['start_sec'] for s in scenes if s.get('status') == 'keep')
    if final_kept < min_threshold:
        print(f"[{project_id}] SAFETY: After budget enforcement only {final_kept:.0f}s. Force-filling...")
        unselected = sorted(
            [s for s in scenes if s.get('status') != 'keep'],
            key=lambda x: x.get('importance', 0),
            reverse=True
        )
        for scene in unselected:
            if final_kept >= target_duration_sec:
                break
            duration = scene['end_sec'] - scene['start_sec']
            if duration < 0.5:
                continue
            scene['status'] = 'keep'
            final_kept += duration

    # Determine transition types
    chronological = sorted(scenes, key=lambda x: x['start_sec'])
    last_kept = None
    for scene in chronological:
        if scene.get('status') == 'keep':
            if last_kept:
                gap = scene['start_sec'] - last_kept['end_sec']
                scene['transition'] = 'dissolve' if gap > 1.0 else 'cut'
            else:
                scene['transition'] = 'fade'
            last_kept = scene

    # Final metrics
    total_kept = sum(s['end_sec'] - s['start_sec'] for s in scenes if s.get('status') == 'keep')
    kept_count = len([s for s in scenes if s.get('status') == 'keep'])
    print(f"[{project_id}] FINAL: {kept_count} scenes, {total_kept:.1f}s (target {target_duration_sec}s)")

    return scenes

