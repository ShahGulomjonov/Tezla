"""
AI Narrative Condensation — generates chapter-based story condensation using GPT-4o.
Falls back to structured mock generation if OpenAI is unavailable.
"""
import os
import json

def generate_condensation(title: str, overview: str, genres: list, cast: list, runtime_min: int, videos: list = None):
    """
    Generate a 10-15 chapter narrative condensation of a movie.
    Uses GPT-4o if OPENAI_API_KEY is set, otherwise falls back to smart mock.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")

    if api_key and api_key != "TODO":
        try:
            return _generate_with_gpt(title, overview, genres, cast, runtime_min, videos, api_key)
        except Exception as e:
            print(f"[Condensation] GPT-4o failed: {e}. Using fallback.")

    return _generate_fallback(title, overview, genres, cast, runtime_min, videos)


def _generate_with_gpt(title, overview, genres, cast, runtime_min, videos, api_key):
    """Use GPT-4o to generate narrative condensation."""
    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    cast_str = ", ".join(cast[:5]) if cast else "unknown cast"
    genre_str = ", ".join(genres[:3]) if genres else "drama"
    num_chapters = max(8, min(15, runtime_min // 10))

    prompt = f"""You are a film narrative expert. Generate a detailed {num_chapters}-chapter condensed retelling of the movie "{title}".

Movie info:
- Genres: {genre_str}
- Runtime: {runtime_min} minutes
- Cast: {cast_str}
- Synopsis: {overview}

For each chapter, provide:
1. "title": A compelling chapter title (e.g. "The Dream Heist Begins")
2. "description": 2-3 paragraphs describing this section of the film in vivid detail, covering key plot points, character moments, and visual elements. Write as if condensing the actual film — be specific and immersive.
3. "key_dialogue": 1-2 memorable dialogue lines from this section (can be approximated)
4. "emotions": Array of 2-3 dominant emotions (e.g. ["tension", "wonder", "melancholy"])
5. "phase": "beginning", "rising_action", "climax", or "resolution"
6. "duration_min": Estimated reading time for this chapter (1-3 minutes)

The total reading time across all chapters should be approximately 15-20 minutes.
Cover the COMPLETE story arc from opening to final scene.

Return ONLY valid JSON: {{ "chapters": [...] }}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    chapters = result.get("chapters", [])

    # Assign video clips to chapters
    if videos:
        _assign_videos_to_chapters(chapters, videos)

    # Add IDs and timing
    current_time = 0
    for i, ch in enumerate(chapters):
        ch["id"] = f"ch-{i:02d}"
        ch["index"] = i
        ch["start_min"] = current_time
        dur = ch.get("duration_min", 2)
        current_time += dur
        ch["end_min"] = current_time

    return chapters


def _generate_fallback(title, overview, genres, cast, runtime_min, videos):
    """Generate structured chapters without GPT (smart mock based on movie metadata)."""
    import random
    random.seed(hash(title) % 10000)

    cast_str = cast[0] if cast else "the protagonist"
    cast2 = cast[1] if len(cast) > 1 else "their companion"
    genre = genres[0] if genres else "Drama"

    # Parse overview for context
    overview_parts = overview.split('. ') if overview else ["A story unfolds."]

    chapter_templates = [
        {
            "title": f"Opening — {title}",
            "description": f"The film opens with a sweeping establishing shot that sets the tone for this {genre.lower()} narrative. We are introduced to {cast_str}'s world — "
                           f"a place that appears ordinary on the surface but carries undercurrents of change. "
                           f"{overview_parts[0]}. The cinematography immediately establishes the visual language that will define the entire film, "
                           f"with carefully composed frames that hint at the conflicts to come.",
            "key_dialogue": f'"This is where it all begins." — {cast_str}',
            "emotions": ["anticipation", "curiosity"],
            "phase": "beginning",
        },
        {
            "title": "Character Introduction",
            "description": f"We dive deeper into {cast_str}'s daily life, understanding their motivations, fears, and desires. "
                           f"Through a series of intimate scenes, the film reveals the complex relationships that define this character. "
                           f"{cast2} enters the narrative, bringing a dynamic energy that shifts the story's trajectory. "
                           f"Key exposition is delivered naturally through dialogue and visual storytelling.",
            "key_dialogue": f'"You don\'t understand what\'s at stake." — {cast2}',
            "emotions": ["empathy", "intrigue"],
            "phase": "beginning",
        },
        {
            "title": "The Inciting Incident",
            "description": f"Everything changes in a pivotal moment that disrupts the established order. "
                           f"{cast_str} faces a challenge that forces them out of their comfort zone. "
                           f"{'The narrative takes an unexpected turn as ' + overview_parts[1] if len(overview_parts) > 1 else 'The stakes are raised dramatically.'} "
                           f"This moment is the catalyst for everything that follows — there is no turning back.",
            "key_dialogue": f'"There\'s no going back now." — {cast_str}',
            "emotions": ["shock", "determination"],
            "phase": "rising_action",
        },
        {
            "title": "Rising Tensions",
            "description": f"The narrative momentum builds as {cast_str} navigates increasingly complex obstacles. "
                           f"Alliances are tested, secrets are revealed, and the true scope of the conflict becomes clear. "
                           f"The {genre.lower()} elements are at their most potent here, with the director using both visual and auditory techniques "
                           f"to create an atmosphere of mounting pressure. Each scene ratchets up the tension another notch.",
            "key_dialogue": f'"We\'re running out of time." — {cast2}',
            "emotions": ["tension", "urgency"],
            "phase": "rising_action",
        },
        {
            "title": "Deepening Complications",
            "description": f"Just when a path forward seems clear, new complications arise that threaten to derail everything. "
                           f"{cast_str} must make difficult choices that test their moral compass. "
                           f"Subplot threads begin to weave together, revealing connections that weren't apparent before. "
                           f"The emotional weight of the story deepens as personal sacrifices become necessary.",
            "key_dialogue": f'"Sometimes the hardest choice is the right one." — {cast_str}',
            "emotions": ["conflict", "sacrifice"],
            "phase": "rising_action",
        },
        {
            "title": "The Midpoint Revelation",
            "description": f"A critical revelation shifts the entire narrative perspective. What seemed certain is now questionable, "
                           f"and {cast_str} must reassess everything they thought they knew. This midpoint twist is the film's most "
                           f"narratively ambitious moment, recontextualizing earlier scenes in a new light. "
                           f"{'The story reveals that ' + overview_parts[2] if len(overview_parts) > 2 else 'The truth proves far more complex than anyone expected.'}",
            "key_dialogue": f'"Everything we believed was wrong." — {cast_str}',
            "emotions": ["revelation", "disbelief"],
            "phase": "rising_action",
        },
        {
            "title": "Escalation",
            "description": f"With new understanding comes new danger. The antagonistic forces close in as {cast_str} races against time. "
                           f"The film's pacing accelerates dramatically, with shorter scenes and more dynamic editing creating a sense "
                           f"of inevitability. {cast2}'s role becomes crucial as alliances are solidified for the final push. "
                           f"Every character is positioned for the climactic confrontation.",
            "key_dialogue": f'"This ends tonight." — {cast_str}',
            "emotions": ["adrenaline", "resolve"],
            "phase": "climax",
        },
        {
            "title": "The Critical Moment",
            "description": f"The climax arrives with devastating precision. {cast_str} confronts the central conflict head-on in a sequence "
                           f"that represents the film's emotional and narrative peak. Years of preparation, sacrifice, and determination "
                           f"converge in this moment. The outcome hangs in the balance as every character's arc reaches its critical point. "
                           f"The director pulls out all stops, combining stunning visuals with a powerful score.",
            "key_dialogue": f'"This is what we were born to do." — {cast_str}',
            "emotions": ["intensity", "catharsis"],
            "phase": "climax",
        },
        {
            "title": "Aftermath & Resolution",
            "description": f"In the aftermath, {cast_str} surveys the changed landscape — both external and internal. "
                           f"The film takes a measured pace to show the consequences of the climactic events. "
                           f"Relationships are redefined, wounds begin to heal, and a new equilibrium emerges. "
                           f"The resolution honors the complexity of the journey while providing emotional closure.",
            "key_dialogue": f'"We made it through." — {cast2}',
            "emotions": ["relief", "hope"],
            "phase": "resolution",
        },
        {
            "title": f"Final Scene — {title}",
            "description": f"The film closes with a beautifully composed final sequence that echoes the opening, "
                           f"showing how far {cast_str} has come. A final image lingers on screen, leaving the audience "
                           f"with a lasting impression that encapsulates the film's core themes. "
                           f"It's a masterful ending that rewards careful attention to the story's journey.",
            "key_dialogue": f'"Some stories never truly end." — {cast_str}',
            "emotions": ["reflection", "satisfaction"],
            "phase": "resolution",
        },
    ]

    # Add more chapters for longer films
    if runtime_min > 150:
        chapter_templates.insert(5, {
            "title": "Parallel Paths",
            "description": f"The narrative splits to follow multiple storylines that will later converge. "
                           f"{cast2}'s perspective reveals dimensions of the conflict previously hidden from view. "
                           f"These parallel threads enrich the tapestry of the story, adding depth and nuance.",
            "key_dialogue": f'"We each have our own battles to fight." — {cast2}',
            "emotions": ["complexity", "anticipation"],
            "phase": "rising_action",
        })
        chapter_templates.insert(8, {
            "title": "The Point of No Return",
            "description": f"Final preparations are made as {cast_str} commits to a course of action from which there is no retreat. "
                           f"The emotional stakes reach their zenith as personal sacrifices loom large. "
                           f"Every moment is charged with an urgency that makes the inevitable confrontation feel both terrifying and necessary.",
            "key_dialogue": f'"Whatever happens next, it was worth it." — {cast_str}',
            "emotions": ["gravity", "determination"],
            "phase": "climax",
        })

    # Assign timing and IDs
    total_reading_min = 25  # Force ~25 minutes total
    per_chapter = total_reading_min / len(chapter_templates)
    current = 0
    for i, ch in enumerate(chapter_templates):
        ch["id"] = f"ch-{i:02d}"
        ch["index"] = i
        dur = round(per_chapter + random.uniform(-0.3, 0.3), 1)
        ch["duration_min"] = dur
        ch["start_min"] = round(current, 1)
        current += dur
        ch["end_min"] = round(current, 1)

    # Assign available videos to chapters
    if videos:
        _assign_videos_to_chapters(chapter_templates, videos)

    return chapter_templates


def _assign_videos_to_chapters(chapters, videos):
    """Map available YouTube clips to relevant chapters."""
    if not videos:
        return

    # Sort videos by type priority
    type_priority = {"Trailer": 0, "Teaser": 1, "Clip": 2, "Featurette": 3, "Behind the Scenes": 4}
    sorted_videos = sorted(videos, key=lambda v: type_priority.get(v.get("type", ""), 5))

    # Assign first trailer to opening, others spread across chapters
    assigned = 0
    target_chapters = [0, len(chapters) // 3, len(chapters) // 2, 2 * len(chapters) // 3]

    for video in sorted_videos:
        if video.get("site") != "YouTube" or not video.get("key"):
            continue
        if assigned < len(target_chapters):
            idx = target_chapters[assigned]
            if idx < len(chapters):
                chapters[idx]["video"] = {
                    "key": video["key"],
                    "name": video.get("name", ""),
                    "type": video.get("type", ""),
                }
            assigned += 1
        if assigned >= 4:  # Max 4 videos
            break
