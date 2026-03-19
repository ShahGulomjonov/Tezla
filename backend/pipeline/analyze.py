import json
from config import settings


def format_timestamp(sec_float):
    m, s = divmod(int(sec_float), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


# ---------------------------------------------------------------------------
# Pareto content classifiers
# ---------------------------------------------------------------------------

_VITAL_MARKERS = [
    "plan", "strategy", "mission", "target", "deal", "choice", "decide",
    "because", "must", "need to", "we have to", "if we", "then we",
    "listen", "remember", "trust", "betray", "evidence", "truth",
    "risk", "consequence", "next move", "prepare", "rules", "objective",
    "why", "promise", "secret", "reveal", "never", "always",
    "understand", "important", "problem", "solution", "future",
]

_TRIVIAL_ACTION_TOKENS = [
    "run", "go", "move", "shoot", "hit", "fight", "car", "gun",
    "now!", "get down", "come on", "let's go", "fast", "look out",
    "watch out", "fire", "boom", "punch", "kick",
]


def _is_vital_few(transcript: str) -> bool:
    text = (transcript or "").lower().strip()
    if not text or text.startswith("[no dialogue") or text == "[audio]":
        return False
    return any(m in text for m in _VITAL_MARKERS)


def _is_trivial_many(transcript: str, has_dialogue: bool, duration: float) -> bool:
    text = (transcript or "").lower().strip()
    if not text or text.startswith("[no dialogue") or text == "[audio]" or text == "[ambient]":
        return True
    if not has_dialogue:
        return True
    action_heavy = any(t in text for t in _TRIVIAL_ACTION_TOKENS)
    if len(text) < 60 and action_heavy:
        return True
    return False


# ---------------------------------------------------------------------------
# Pareto 80/20 prompt builder (shared by Opus & Gemini)
# ---------------------------------------------------------------------------

def _build_pareto_prompt(film_duration: float, transcript_block: str) -> str:
    return f"""System Prompt: Tezla Core – Universal Narrative Framework (Inverted Pareto 80/20)

[Tizim Roli]
Siz "Tezla" platformasi uchun dunyodagi eng tajribali "Narrative Architect" va video tahrirchisisiz.
Vazifangiz: Har qanday to'liq metrajli filmni qat'iy mantiqiy ketma-ketlik asosida tahlil qilish va uni
{settings.TARGET_BUDGET_SECONDS} soniyalik (taxminan {settings.TARGET_BUDGET_SECONDS//60} daqiqa) "Strategic Condensed Version" holatiga keltirish.

[Universal Mantiqiy Xarita — {settings.TARGET_BUDGET_SECONDS//60} daqiqalik qolip]

1. STRATEGIK YADRO (Umumiy vaqtning 80% qismi):
   - Poydevor va Motiv (Kontekst, Inciting Incident): Bosh qahramon kim? Ziddiyat nima? Harakat nima uchun boshlandi?
   - Strategiya va Psixologik rivojlanish (Master Plan, Midpoint): Sirlarning ochilishi, qahramonning muammoni hal qilish rejasi, syujetni harakatlantiruvchi dialoglar.
   - Klimaks va Psixologik Tugun (Plot Twists, Resolution): Qahramonning dushman bilan oxirgi psixologik to'qnashuvi, yakuniy yechim.
   - Maqsad: Tomoshabin harakatning (action) sababini va mantiqiy oqibatini albatta dialoglar orqali to'liq tushunishi shart.

2. EKSHN KADRLAR (Umumiy vaqtning 20% qismi):
   - Harakat sahnalarini (janglar, poygalar, otishmalar, vizual effektlar) minimal darajaga tushiring.
   - TRIGGER (Ekshn starti): Harakat nima uchun boshlandi? Ilk o'q uzilishi yoxud quvishning boshlanishi.
   - OUTCOME (Ekshn yakuni): Ekshn qanday natija berdi? (kimdir bedarak ketdi, yengildi yoxud qochib qutuldi).
   - DROP: O'rtadagi texnik xoreografiya, uzun vizual sahnalar, "Texnik filler"lar SHAFQATSIZLARCHA KESIB TASHLANSIN.

[Qat'iy Talablar]
- Jami davomiylik: Qat'iy <= {settings.TARGET_BUDGET_SECONDS} soniya.
- Sahnaga izoh yozishda (narrative_justification) ushbu frameworkga qanday mos tushishini yozing (Masalan: "[CONTEXT]", "[INCITING_INCIDENT]", "[MASTER_PLAN]", "[ACTION_TRIGGER]", "[ACTION_OUTCOME]", "[PLOT_TWIST]").
- Jami natija uzilib qolgan videodek emas, mantiqiy uzviylikka ega bo'lgan intellektual va strategik skelet bo'lishi shart.

[Muhim: JSON formatda javob bering]
Javobingizni faqat validJSON formatda bering, boshqa hech narsa emas:
{{
  "movie_id": "condensed",
  "total_condensed_duration_seconds": <integer>,
  "retained_scenes": [
    {{
      "scene_order": <integer>,
      "start_timestamp": "HH:MM:SS",
      "end_timestamp": "HH:MM:SS",
      "relevance_score": <float 0.0-1.0>,
      "scene_type": "strategic" | "action",
      "narrative_justification": "<string>"
    }}
  ]
}}

[Film Timeline — {film_duration/60:.0f} daqiqa]
{transcript_block}
"""


# ---------------------------------------------------------------------------
# Build timeline block from scenes
# ---------------------------------------------------------------------------

def _build_timeline_block(scenes: list[dict]) -> str:
    lines = []
    for i, scene in enumerate(scenes):
        start_ts = format_timestamp(scene['start_sec'])
        end_ts = format_timestamp(scene['end_sec'])
        dur = int(scene['end_sec'] - scene['start_sec'])
        transcript = (scene.get('transcript') or '').strip()
        if not transcript:
            transcript = "[No dialogue / Action / Ambient]"
        lines.append(f"Scene {i+1} | {start_ts} to {end_ts} | {dur}s\nTranscript: {transcript}\n")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Map AI response to scenes
# ---------------------------------------------------------------------------

def _map_retained_to_scenes(scenes: list[dict], retained: list[dict]):
    """Reset all scenes to cut, then map retained selections back."""
    for scene in scenes:
        scene['importance'] = 0.1
        scene['status'] = 'cut'
        scene['scene_type'] = 'action'
        scene['rationale'] = "[To'ldiruvchi 20%] Cut by Pareto filter."
        scene['characters'] = []
        scene['emotions'] = []
        scene['confidence'] = 0.9

    mapped = 0
    for item in retained:
        idx = int(item.get('scene_order', 1)) - 1
        if 0 <= idx < len(scenes):
            scenes[idx]['importance'] = float(item.get('relevance_score', 0.9))
            scenes[idx]['status'] = 'keep'
            scenes[idx]['scene_type'] = item.get('scene_type', 'strategic')
            scenes[idx]['rationale'] = str(item.get('narrative_justification', '[Oltin 80%] Retained.'))
            mapped += 1
    return mapped


# ---------------------------------------------------------------------------
# Anthropic Claude Opus — Primary AI Engine
# ---------------------------------------------------------------------------

def _score_with_opus(project_id: str, scenes: list[dict], film_duration: float):
    """Use Anthropic Claude Opus for narrative scene selection."""
    try:
        import anthropic
    except ImportError as e:
        print(f"[{project_id}] Anthropic SDK not installed: {e}")
        return None

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception as e:
        print(f"[{project_id}] Anthropic client init failed: {e}")
        return None

    transcript_block = _build_timeline_block(scenes)
    prompt = _build_pareto_prompt(film_duration, transcript_block)

    print(f"[{project_id}] Sending {film_duration/60:.0f}-min transcript to Claude Opus (Pareto mode)...")

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract JSON from response
        response_text = message.content[0].text.strip()
        # Handle potential markdown wrapping
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            json_lines = [l for l in lines if not l.startswith("```")]
            response_text = "\n".join(json_lines)

        result = json.loads(response_text)
        retained = result.get('retained_scenes', [])
        total_dur = result.get('total_condensed_duration_seconds', 0)
        print(f"[{project_id}] Claude Opus retained {len(retained)} scenes ({total_dur}s).")

        mapped = _map_retained_to_scenes(scenes, retained)
        print(f"[{project_id}] Mapped {mapped} Oltin 80% (Vital Few) scenes via Opus.")
        return scenes

    except Exception as e:
        print(f"[{project_id}] Claude Opus failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Google Gemini — Fallback AI Engine
# ---------------------------------------------------------------------------

def _score_with_gemini(project_id: str, scenes: list[dict], film_duration: float):
    """Use Google Gemini as fallback AI engine."""
    try:
        from google import genai
        from google.genai import types
    except Exception as e:
        print(f"[{project_id}] Gemini SDK unavailable: {e}")
        return None

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        model_name = "gemini-2.5-pro"
    except Exception as e:
        print(f"[{project_id}] GenAI setup failed: {e}")
        return None

    transcript_block = _build_timeline_block(scenes)
    prompt = _build_pareto_prompt(film_duration, transcript_block)

    response_schema = {
        "type": "object",
        "properties": {
            "movie_id": {"type": "string"},
            "total_condensed_duration_seconds": {
                "type": "integer",
                "description": "Umumiy davomiylik (soniya). Maks {}.".format(settings.TARGET_BUDGET_SECONDS),
            },
            "retained_scenes": {
                "type": "array",
                "description": "Oltin 80% (Vital Few) — saqlanadigan sahnalar xronologik tartibda.",
                "items": {
                    "type": "object",
                    "properties": {
                        "scene_order": {"type": "integer"},
                        "start_timestamp": {"type": "string"},
                        "end_timestamp": {"type": "string"},
                        "relevance_score": {"type": "number", "description": "0.0–1.0"},
                        "scene_type": {
                            "type": "string",
                            "enum": ["strategic", "action"],
                        },
                        "narrative_justification": {"type": "string"},
                    },
                    "required": [
                        "scene_order", "start_timestamp", "end_timestamp",
                        "relevance_score", "scene_type", "narrative_justification",
                    ],
                },
            },
        },
        "required": ["movie_id", "total_condensed_duration_seconds", "retained_scenes"],
    }

    print(f"[{project_id}] Sending {film_duration/60:.0f}-min transcript to Gemini (Pareto fallback)...")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.2,
            ),
        )
        result = json.loads(response.text)
        retained = result.get('retained_scenes', [])
        print(f"[{project_id}] Gemini retained {len(retained)} scenes ({result.get('total_condensed_duration_seconds')}s).")

        mapped = _map_retained_to_scenes(scenes, retained)
        print(f"[{project_id}] Mapped {mapped} Oltin 80% (Vital Few) scenes via Gemini.")
        return scenes

    except Exception as e:
        print(f"[{project_id}] Gemini JSON failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Main AI scoring entry point
# ---------------------------------------------------------------------------

def score_scenes(project_id: str, scenes: list[dict], film_duration: float):
    """
    Tezla Core – Pareto-Optimized Narrative Extraction.
    Priority chain: Claude Opus → Gemini → Local Pareto fallback.
    """
    print(f"[{project_id}] Tezla Core Pareto: starting scene selection...")

    # 1. Try Claude Opus (primary)
    if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "TODO":
        result = _score_with_opus(project_id, scenes, film_duration)
        if result is not None:
            return _apply_pareto_rules(result, film_duration)
        print(f"[{project_id}] Opus failed. Trying Gemini fallback...")

    # 2. Try Gemini (secondary fallback)
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "TODO":
        result = _score_with_gemini(project_id, scenes, film_duration)
        if result is not None:
            return _apply_pareto_rules(result, film_duration)
        print(f"[{project_id}] Gemini also failed. Using local Pareto mock...")

    # 3. Local Pareto mock scoring (ultimate fallback)
    print(f"[{project_id}] No AI available. Pareto mock scoring.")
    return pareto_mock_scoring(scenes, film_duration)


# ---------------------------------------------------------------------------
# Local Pareto mock scoring (when all AI is unavailable)
# ---------------------------------------------------------------------------

def pareto_mock_scoring(scenes: list[dict], film_duration: float = 0):
    total = film_duration if film_duration > 0 else (scenes[-1]['end_sec'] if scenes else 60)

    labels = [
        "Opening", "Introduction", "Setup", "Transition", "Development",
        "Rising Action", "Conflict", "Climax Build", "Climax", "Resolution",
        "Falling Action", "Denouement", "Ending", "Epilogue",
    ]

    for i, scene in enumerate(scenes):
        position = scene['start_sec'] / max(total, 1)
        transcript = (scene.get('transcript') or '').strip()
        has_dialogue = len(transcript) > 20
        duration = scene['end_sec'] - scene['start_sec']
        vital = _is_vital_few(transcript)
        trivial = _is_trivial_many(transcript, has_dialogue, duration)

        # --- Pareto base importance from narrative position ---
        # Fallback scoring: hit the 25-minute mark (~1500 sec)
        if position < 0.08:
            base = 0.95 if vital else (0.60 if trivial else 0.80)
        elif position < 0.20:
            base = 0.90 if vital else (0.55 if trivial else 0.75)
        elif 0.45 < position < 0.65:
            base = 0.92 if vital else (0.65 if trivial else 0.85)
        elif position > 0.88:
            base = 0.90
        elif position > 0.75:
            base = 0.85
        elif position < 0.30:
            base = 0.80
        else:
            base = 0.75

        # Dialogue / strategic bonus
        if has_dialogue:
            base += min(0.20, len(transcript) / 500)
            if vital:
                base += 0.25
            trimmed = transcript.rstrip()
            if trimmed and trimmed[-1] not in '.!?':
                base = max(base, 0.85)

        # Trivial penalty (action/ambient without dialogue)
        if trivial:
            base = min(base, 0.60)

        # Short silent transitions
        if duration < 5 and not has_dialogue:
            base *= 0.6

        # Long dialogue scenes are likely vital
        if duration > 25 and has_dialogue and not trivial:
            base = max(base, 0.70)

        base = round(min(1.0, max(0.0, base)), 2)

        scene['importance'] = base
        scene['scene_type'] = 'strategic' if vital or (has_dialogue and not trivial) else 'action'
        scene['label'] = labels[i % len(labels)]
        scene['rationale'] = _pareto_rationale(base, vital, trivial, has_dialogue, position)
        scene['characters'] = ["Character A", "Character B"] if has_dialogue else ["Character A"]
        scene['emotions'] = _infer_emotions(position, has_dialogue, transcript)
        scene['confidence'] = 0.78 if has_dialogue else 0.58
        scene['dialogue_complete'] = True

    return _apply_pareto_rules(scenes, total)


# ---------------------------------------------------------------------------
# Guaranteed Pareto rules (post-processing)
# ---------------------------------------------------------------------------

def _apply_pareto_rules(scenes: list[dict], film_duration: float):
    if not scenes:
        return scenes

    found_cast_start = False

    for scene in scenes:
        pos = scene['start_sec'] / max(film_duration, 1)
        transcript = (scene.get('transcript') or '').strip()
        has_dialogue = len(transcript) > 20
        duration = scene['end_sec'] - scene['start_sec']
        vital = _is_vital_few(transcript)
        trivial = _is_trivial_many(transcript, has_dialogue, duration)

        # Opening 20%: aggressively cut trivial, boost vital
        if pos < 0.20:
            if trivial and not vital:
                scene['importance'] = min(scene.get('importance', 0.5), 0.40)
                scene['rationale'] = "[To'ldiruvchi 20%: Opening action deprioritized] " + scene.get('rationale', '')
            elif vital:
                scene['importance'] = max(scene.get('importance', 0.6), 0.85)
                scene['rationale'] = "[Oltin 80%: Opening strategy boosted] " + scene.get('rationale', '')

        # Climax zone (88–94%): always boost
        if 0.88 <= pos < 0.94:
            if scene.get('importance', 0) < 0.85:
                scene['importance'] = 0.85
                scene['rationale'] = "[Oltin 80%: Climax guaranteed] " + scene.get('rationale', '')

        # Credits (94%+): keep first 10s only
        if pos >= 0.94:
            if not found_cast_start:
                scene['importance'] = 2.0
                scene['rationale'] = "[Cast start] " + scene.get('rationale', '')
                if scene['end_sec'] - scene['start_sec'] > 10.0:
                    scene['end_sec'] = scene['start_sec'] + 10.0
                found_cast_start = True
            else:
                scene['importance'] = 0.0
                scene['rationale'] = "[To'ldiruvchi 20%: Trailing credits cut]"

    return scenes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pareto_rationale(importance, vital, trivial, has_dialogue, position) -> str:
    if vital and importance >= 0.75:
        if position <= 0.15: return "[CONTEXT] Poydevor va Motiv."
        elif position >= 0.80: return "[PLOT_TWIST] Klimaks va Psixologik Tugun."
        else: return "[MASTER_PLAN] Strategiya va psixologik rivojlanish."
    if importance >= 0.75:
        tag = "active dialogue" if has_dialogue else "ko'rgazmali voqea"
        if position <= 0.15: return f"[INCITING_INCIDENT] Ziddiyat yuzaga kelishi ({tag})."
        elif position >= 0.80: return f"[RESOLUTION] Yechim."
        else: return f"[MASTER_PLAN] Muhim sahna ({tag})."
    if importance >= 0.55:
        if not has_dialogue: return "[ACTION_TRIGGER] Harakat starti (Trigger)."
        return "[MASTER_PLAN] O'rta miyona strategik sahna."
    if trivial:
        return "[DROP] Texnik filler / Atmosfera — kesish kerak."
    if not has_dialogue:
        return "[ACTION_OUTCOME] Harakat yakuni (Outcome)."
    return "[DROP] Trivial Many — narrativ ahamiyati past."


def _infer_emotions(position: float, has_dialogue: bool, transcript: str) -> list[str]:
    emotions = []
    if position < 0.15:
        emotions.append("exposition")
    elif 0.45 < position < 0.65:
        emotions.extend(["tension", "climax"])
    elif position > 0.85:
        emotions.append("resolution")
    else:
        emotions.append("development")

    if has_dialogue:
        lower = transcript.lower()
        if any(w in lower for w in ['!', 'stop', 'no', 'never', 'fight', 'kill']):
            emotions.append("conflict")
        elif any(w in lower for w in ['love', 'miss', 'sorry', 'please']):
            emotions.append("emotional")
        else:
            emotions.append("dialogue")

    return emotions if emotions else ["neutral"]
