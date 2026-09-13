"""
AI Service — Groq (Llama 3) integration for SportGuard.

Two functions:
1. generate_static_recommendation()  → Called automatically after video analysis.
   Returns a structured JSON plan (exercises, mobility, recovery) saved to the DB.

2. generate_chat_response()  → Called on-demand from the chat endpoint.
   Returns an ephemeral text reply tailored to the user's role.
   Nothing is saved to the DB.
"""

import json
import logging
import time
from typing import Optional

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Model to use for all Groq calls ─────────────────────────────────────────
# groq/compound-mini: Groq's own production model, confirmed available on this API key.
# Available models on this key: qwen/qwen3.6-27b, qwen/qwen3.8-27b,
#   openai/gpt-oss-20b, openai/gpt-oss-120b, groq/compound, groq/compound-mini
# groq/compound-mini is chosen for best balance of speed, quality and rate limits.
GROQ_MODEL = "groq/compound-mini"

# ─── Initialise Groq client ───────────────────────────────────────────────────
_client: Optional[Groq] = None

def _get_client() -> Optional[Groq]:
    global _client
    if _client is None and settings.GROQ_API_KEY:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _call_groq(
    client: Groq,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_retries: int = 2,
    retry_delay: int = 20,
) -> str:
    """
    Core Groq call helper shared by all three functions.
    Automatically retries on 429 rate-limit errors.
    Raises RuntimeError('RATE_LIMIT_EXHAUSTED') if all retries fail.
    """
    for attempt in range(max_retries + 1):
        try:
            completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=temperature,
            )
            # Record token metrics
            if hasattr(completion, "usage") and completion.usage:
                from app.core.ai_tracker import record_ai_usage
                record_ai_usage(
                    prompt_tokens=getattr(completion.usage, "prompt_tokens", 0) or 0,
                    completion_tokens=getattr(completion.usage, "completion_tokens", 0) or 0,
                    total_tokens=getattr(completion.usage, "total_tokens", 0) or 0,
                )
            raw_content = completion.choices[0].message.content.strip()
            # Strip <think>...</think> reasoning blocks emitted by Qwen3 models
            import re as _re
            raw_content = _re.sub(r"<think>.*?</think>", "", raw_content, flags=_re.DOTALL).strip()
            return raw_content
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate_limit" in err_str.lower() or "rate limit" in err_str.lower():
                if attempt < max_retries:
                    logger.warning(
                        f"Groq rate limited (429). Retrying in {retry_delay}s "
                        f"(attempt {attempt + 1}/{max_retries})..."
                    )
                    time.sleep(retry_delay)
                    continue
                raise RuntimeError("RATE_LIMIT_EXHAUSTED") from e
            raise  # re-raise non-rate-limit errors immediately


# ─── Role-based system prompts ───────────────────────────────────────────────
ROLE_SYSTEM_PROMPTS = {
    "athlete": (
        "You are a friendly, encouraging personal sports coach AI.\n"
        "You are speaking directly with an athlete. They are NOT a medical professional.\n"
        "\n"
        "IMPORTANT — Context awareness rules:\n"
        "1. If the user asks a sports, injury, training, or recovery question, respond using these structured headings:\n"
        "   ## How You're Looking\n"
        "   ## Your Exercises\n"
        "   ## Rest & Recovery\n"
        "   Keep each section to 2-4 bullet points. Use simple, everyday language. No medical jargon.\n"
        "2. If the user asks something UNRELATED to sports or injury (e.g. asking you to create images,\n"
        "   generate files, browse the web, write code, etc.), respond NATURALLY in 1-2 plain sentences.\n"
        "   Do NOT use any section headings for these off-topic replies.\n"
        "   Clearly and politely state what you can and cannot do. Example: 'I can't create images — I'm a text-only assistant focused on your training and injury data.'\n"
        "3. If the user asks a casual greeting or general question, reply conversationally without headings.\n"
        "4. Be encouraging and motivating in tone at all times.\n"
    ),
    "coach": (
        "You are an expert sports performance AI assistant for professional coaches.\n"
        "You are speaking with a coach who manages athlete training load and team selection.\n"
        "\n"
        "IMPORTANT — Context awareness rules:\n"
        "1. If the user asks about a player's status, training load, injury risk, or team performance,\n"
        "   respond using these structured headings:\n"
        "   ## Player Status\n"
        "   ## Training Guidance\n"
        "   ## What to Avoid\n"
        "   ## Suggested Activities\n"
        "   - Player Status: One clear sentence. Is the player okay to train? Yes/No/With caution.\n"
        "   - Training Guidance: What workouts are safe? How hard? For how long?\n"
        "   - What to Avoid: Specific movements or drills to skip and why.\n"
        "   - Suggested Activities: 2-3 specific drills or exercises that are safe right now.\n"
        "   - Keep each section brief (2-4 bullets). Do NOT mention AI model scores, probabilities, or raw angles.\n"
        "2. If the user asks something UNRELATED to sports, coaching, or injury (e.g. asking you to create\n"
        "   images, generate files, browse the web, write code, etc.), respond NATURALLY in 1-2 plain sentences.\n"
        "   Do NOT use any section headings for these off-topic replies.\n"
        "   Clearly and politely state what you can and cannot do. Example: 'I can't generate images — I'm a text-only assistant built to help you manage your athletes and training plans.'\n"
        "3. If the user asks a casual greeting or general question, reply conversationally without headings.\n"
    ),
    "physiotherapist": (
        "You are an AI clinical decision-support assistant for sports physiotherapists.\n"
        "You are speaking with a qualified physiotherapist who understands anatomy and rehabilitation.\n"
        "\n"
        "IMPORTANT — Context awareness rules:\n"
        "1. If the user asks about clinical findings, rehabilitation, mobility, or return-to-sport,\n"
        "   respond using these structured headings:\n"
        "   ## Issues Detected\n"
        "   ## Rehabilitation Protocol\n"
        "   ## Mobility Targets\n"
        "   ## Return-to-Sport Timeline\n"
        "   Use precise clinical terminology. Keep answers focused; only expand when asked.\n"
        "   Note if escalation to a physician is warranted.\n"
        "2. If the user asks something UNRELATED to physiotherapy or athlete health (e.g. asking you to create\n"
        "   images, generate files, browse the web, write code, etc.), respond NATURALLY in 1-2 plain sentences.\n"
        "   Do NOT use any section headings for these off-topic replies.\n"
        "   Clearly and politely state what you can and cannot do.\n"
        "3. If the user asks a casual greeting or general question, reply conversationally without headings.\n"
    ),
    "scientist": (
        "You are an AI data science and biomechanics assistant for sports scientists.\n"
        "You are speaking with a sports scientist who analyses model performance and injury data.\n"
        "\n"
        "IMPORTANT — Context awareness rules:\n"
        "1. If the user asks about model results, biomechanics, risk factors, or data analysis,\n"
        "   respond using these structured headings:\n"
        "   ## Model Analysis\n"
        "   ## Biomechanical Observations\n"
        "   ## Risk Vector\n"
        "   ## Recommendations\n"
        "   Use technical language freely (XGBoost, softmax probabilities, feature importance, ROM).\n"
        "   Be analytical and precise; expand on request.\n"
        "2. If the user asks something UNRELATED to sports science or biomechanics (e.g. asking you to create\n"
        "   images, generate files, browse the web, write code, etc.), respond NATURALLY in 1-2 plain sentences.\n"
        "   Do NOT use any section headings for these off-topic replies.\n"
        "   Clearly and politely state what you can and cannot do.\n"
        "3. If the user asks a casual greeting or general question, reply conversationally without headings.\n"
    ),
}


# ─── Function 1: Static Recommendation (saved to DB) ─────────────────────────
def generate_static_recommendation(
    risk_level: str,
    sport_type: str,
    active_flags: dict,
    injury_history: list = None,
) -> Optional[dict]:
    """
    Generates a structured corrective plan for the athlete.
    Called automatically after video analysis. The result is saved to the DB.

    Returns a dict like:
    {
        "exercise_recommendations": ["...", "..."],
        "mobility_suggestions": ["...", "..."],
        "recovery_planning": ["...", "..."]
    }
    Or None if Groq is unavailable.
    """
    client = _get_client()
    if not client:
        logger.warning("Groq client not initialized — GROQ_API_KEY may be missing.")
        return None

    # Build a human-readable summary of the active risk flags
    flag_descriptions = []
    flag_map = {
        "knee_hyperextension": "Knee Hyperextension detected",
        "knee_acute_flexion": "Acute Knee Flexion (ACL risk) detected",
        "knee_valgus": "Knee Valgus (inward knee collapse) detected",
        "excessive_trunk_lean": "Excessive Trunk Lean detected",
        "low_symmetry": "Low Movement Symmetry between left and right sides",
        "elbow_hyperextension": "Elbow Hyperextension detected",
    }
    for key, description in flag_map.items():
        if active_flags.get(key, False):
            flag_descriptions.append(f"- {description}")

    flags_text = "\n".join(flag_descriptions) if flag_descriptions else "- No specific biomechanical flags detected"

    system_prompt = "You are an expert sports physiotherapist AI. Respond ONLY with valid JSON — no markdown, no explanation, no code fences."

    user_prompt = f"""A video analysis has been completed for an athlete. Generate a structured corrective training plan.

Athlete Details:
- Sport: {sport_type.replace("_", " ").title()}
- AI Risk Level: {risk_level.upper()}
- Past Injury History: {', '.join(injury_history) if injury_history else 'None reported'}

Active Biomechanical Risk Flags:
{flags_text}

Respond ONLY with this exact JSON schema:

{{
  "exercise_recommendations": [
    "specific exercise 1 targeting the detected issues",
    "specific exercise 2",
    "specific exercise 3"
  ],
  "mobility_suggestions": [
    "specific stretch or mobility drill 1",
    "specific stretch or mobility drill 2"
  ],
  "recovery_planning": [
    "specific recovery step 1 (e.g. rest days, ice, load reduction)",
    "specific recovery step 2"
  ]
}}"""

    try:
        raw = _call_groq(client, system_prompt, user_prompt, temperature=0.4)
        # Strip markdown code fences if the model wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        logger.info(f"Raw Groq output before parse: {repr(raw)}")
        return json.loads(raw.strip())
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Groq free-tier daily quota exhausted for static recommendations.")
        else:
            logger.error(f"Groq static recommendation failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Groq static recommendation failed: {e}")
        return None


# ─── Function 2: Ephemeral Chat Response (NOT saved to DB) ───────────────────
def generate_chat_response(
    session_context: dict,
    user_role: str,
    user_message: str,
) -> str:
    """
    Generates a role-aware chat response for the floating chatbot.
    This is called on-demand and the response is never persisted to the DB.

    session_context: dict containing risk_level, sport_type, flags, biomechanics summary
    user_role: "athlete" | "coach" | "physiotherapist" | "scientist"
    user_message: the free-text question from the user
    """
    client = _get_client()
    if not client:
        return "AI assistant is currently unavailable. Please check the API configuration."

    system_prompt = ROLE_SYSTEM_PROMPTS.get(user_role, ROLE_SYSTEM_PROMPTS["athlete"])

    # Build the session context summary injected silently into the prompt
    context_block = f"""
ATHLETE SESSION CONTEXT (use this as background knowledge — do NOT list it out):
- Sport: {session_context.get('sport_type', 'Unknown')}
- AI Risk Level: {session_context.get('risk_level', 'Unknown').upper()}
- Past Injury History: {', '.join(session_context.get('injury_history', [])) or 'None'}
- Model Confidence: {round((session_context.get('confidence', 0) or 0) * 100, 1)}%
- Movement Symmetry: {round((session_context.get('symmetry', 0) or 0) * 100, 1)}%
- Active Risk Flags: {', '.join(session_context.get('active_flags', [])) or 'None'}
- Trunk Lean Average: {session_context.get('trunk_lean', 'N/A')}°
- Knee Valgus Average: {session_context.get('knee_valgus', 'N/A')}°
"""

    user_prompt = f"{context_block}\n\nUser Question: {user_message}"

    try:
        return _call_groq(client, system_prompt, user_prompt, temperature=0.6, max_retries=0)
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Groq free-tier daily quota exhausted for chat.")
            return (
                "⚠️ **Sporty is temporarily resting!**\n\n"
                "The AI assistant has hit its free-tier daily limit. "
                "This resets automatically every 24 hours.\n\n"
                "💡 *Tip: Add a new GROQ_API_KEY in backend/.env to restore instantly.*"
            )
        logger.error(f"Groq chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."
    except Exception as e:
        logger.error(f"Groq chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."


# ─── Function 3: Global Dashboard Chat Response (NOT saved to DB) ────────────
def generate_dashboard_chat_response(
    dashboard_context: dict,
    user_role: str,
    user_message: str,
) -> str:
    """
    Generates a role-aware chat response for the global dashboard chatbot.
    The context contains either Team Roster stats (for coaches) or Overall Progress (for athletes).
    """
    client = _get_client()
    if not client:
        return "AI assistant is currently unavailable. Please check the API configuration."

    system_prompt = ROLE_SYSTEM_PROMPTS.get(user_role, ROLE_SYSTEM_PROMPTS["athlete"])

    if user_role in ["coach", "physiotherapist", "scientist"]:
        context_block = f"""
TEAM DASHBOARD CONTEXT (use this as background knowledge — do NOT list it out):
- Total Athletes: {dashboard_context.get('total_athletes', 0)}
- High/Critical Risk Athletes: {dashboard_context.get('high_risk_count', 0)}
- Active Athletes details:
"""
        for a in dashboard_context.get('athletes', []):
            context_block += f"  * {a['name']} ({a['sport']}): Risk={a['risk']}, Sym={a['sym']}%. Injuries: {a['injuries']}\n"
    else:
        context_block = f"""
ATHLETE OVERVIEW CONTEXT (use this as background knowledge — do NOT list it out):
- Total Videos Analysed: {dashboard_context.get('total_sessions', 0)}
- Latest Risk Level: {dashboard_context.get('latest_risk', 'Unknown').upper()}
- Average Symmetry: {dashboard_context.get('avg_symmetry', 'N/A')}%
- Past Injuries: {', '.join(dashboard_context.get('injuries', [])) or 'None'}
"""

    user_prompt = f"{context_block}\n\nUser Question: {user_message}"

    try:
        return _call_groq(client, system_prompt, user_prompt, temperature=0.6, max_retries=0)
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Groq free-tier daily quota exhausted for dashboard chat.")
            return (
                "⚠️ **Sporty is temporarily resting!**\n\n"
                "The AI assistant has hit its free-tier daily limit. "
                "This resets automatically every 24 hours.\n\n"
                "💡 *Tip: Add a new GROQ_API_KEY in backend/.env to restore instantly.*"
            )
        logger.error(f"Groq dashboard chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."
    except Exception as e:
        logger.error(f"Groq dashboard chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."
