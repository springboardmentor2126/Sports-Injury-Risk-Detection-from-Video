"""
AI Service — Google Gemini integration for SportGuard.

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

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Initialise Gemini client ─────────────────────────────────────────────────
_client: Optional[genai.Client] = None

def _get_client() -> Optional[genai.Client]:
    global _client
    if _client is None and settings.GEMINI_API_KEY:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _call_gemini_with_retry(client, model: str, prompt: str, temperature: float, max_retries: int = 2) -> str:
    """
    Calls Gemini with automatic retry on 429 rate limit errors.
    Raises exception if all retries are exhausted or an unrecoverable error occurs.
    """
    delay = 25  # seconds to wait between retries (free tier retry delay is ~20s)
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=temperature),
            )
            return response.text.strip()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                if attempt < max_retries:
                    logger.warning(f"Gemini rate limited (429). Retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
                    time.sleep(delay)
                    continue
                else:
                    raise RuntimeError("RATE_LIMIT_EXHAUSTED") from e
            raise  # re-raise non-rate-limit errors immediately



# ─── Role-based system prompts ───────────────────────────────────────────────
ROLE_SYSTEM_PROMPTS = {
    "athlete": (
        "You are a friendly, encouraging personal sports coach AI.\n"
        "You are speaking directly with an athlete. They are NOT a medical professional.\n"
        "ALWAYS structure your response with clear sections using these exact headings:\n"
        "## How You're Looking\n"
        "## Your Exercises\n"
        "## Rest & Recovery\n"
        "Rules:\n"
        "- Use simple, everyday language. No medical jargon.\n"
        "- Keep each section short — 2-4 bullet points max.\n"
        "- Be encouraging and motivating.\n"
        "- If asked for more detail on something, expand on that section only.\n"
        "- NEVER give a wall of text. Always use the above sections.\n"
    ),
    "coach": (
        "You are an expert sports performance AI assistant for professional coaches.\n"
        "You are speaking with a coach who manages athlete training load and team selection.\n"
        "ALWAYS structure your response with clear sections using these exact headings:\n"
        "## Player Status\n"
        "## Training Guidance\n"
        "## What to Avoid\n"
        "## Suggested Activities\n"
        "Rules:\n"
        "- Use plain English — coaches understand sport but NOT medical statistics or probabilities.\n"
        "- Player Status: One clear sentence. Is the player okay to train? Yes/No/With caution.\n"
        "- Training Guidance: What workouts are safe? How hard? For how long?\n"
        "- What to Avoid: Specific movements or drills to skip and why.\n"
        "- Suggested Activities: 2-3 specific drills or exercises that are safe right now.\n"
        "- Keep each section brief (2-4 bullets). Only expand when asked.\n"
        "- Do NOT mention AI model confidence scores, probabilities, or raw angles.\n"
    ),
    "physiotherapist": (
        "You are an AI clinical decision-support assistant for sports physiotherapists.\n"
        "You are speaking with a qualified physiotherapist who understands anatomy and rehabilitation.\n"
        "ALWAYS structure your response with clear sections using these exact headings:\n"
        "## Issues Detected\n"
        "## Rehabilitation Protocol\n"
        "## Mobility Targets\n"
        "## Return-to-Sport Timeline\n"
        "Rules:\n"
        "- Use precise clinical terminology (e.g., valgus collapse, hip abduction deficit, ROM).\n"
        "- Issues Detected: List specific biomechanical findings from the session data.\n"
        "- Rehabilitation Protocol: Specific exercises with sets/reps if relevant.\n"
        "- Mobility Targets: Range of motion goals and stretching priorities.\n"
        "- Return-to-Sport Timeline: Conservative estimate with milestones.\n"
        "- Keep answers focused; only expand into full detail when asked.\n"
        "- Note if escalation to a physician is warranted.\n"
    ),
    "scientist": (
        "You are an AI data science and biomechanics assistant for sports scientists.\n"
        "You are speaking with a sports scientist who analyses model performance and injury data.\n"
        "ALWAYS structure your response with clear sections using these exact headings:\n"
        "## Model Analysis\n"
        "## Biomechanical Observations\n"
        "## Risk Vector\n"
        "## Recommendations\n"
        "Rules:\n"
        "- Use technical language freely (XGBoost, softmax probabilities, feature importance, ROM).\n"
        "- Model Analysis: Discuss the XGBoost confidence and classification outcome.\n"
        "- Biomechanical Observations: Key angle deviations and flag patterns.\n"
        "- Risk Vector: What specific combination of flags drove the risk classification.\n"
        "- Recommendations: Suggestions for further analysis or model improvement if relevant.\n"
        "- Be analytical and precise; expand on request.\n"
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
    Or None if Gemini is unavailable.
    """
    client = _get_client()
    if not client:
        logger.warning("Gemini client not initialized — GEMINI_API_KEY may be missing.")
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

    prompt = f"""
You are an expert sports physiotherapist AI. A video analysis has been completed for an athlete.

ANALYSIS RESULTS:
Provide a structured, JSON-only corrective training plan taking this data into account.

Athlete Details:
- Sport: {sport_type.replace("_", " ").title()}
- AI Risk Level: {risk_level.upper()}
- Past Injury History: {', '.join(injury_history) if injury_history else 'None reported'}

Active Biomechanical Risk Flags:
{flags_text}

You MUST respond ONLY with a valid JSON object matching this exact schema. Do not include any explanation outside the JSON:

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
}}
"""

    try:
        raw = _call_gemini_with_retry(client, "gemini-2.0-flash", prompt, temperature=0.4)
        # Strip markdown code fences if Gemini wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        logger.info(f"Raw Gemini output before parse: {repr(raw)}")
        return json.loads(raw.strip())
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Gemini free-tier daily quota exhausted for static recommendations.")
        else:
            logger.error(f"Gemini static recommendation failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini static recommendation failed: {e}")
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

    full_prompt = f"{system_prompt}\n\n{context_block}\n\nUser Question: {user_message}"

    try:
        return _call_gemini_with_retry(client, "gemini-2.0-flash", full_prompt, temperature=0.6)
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Gemini free-tier daily quota exhausted for chat.")
            return (
                "⚠️ **Sporty is temporarily resting!**\n\n"
                "The AI assistant has hit its free-tier daily limit (20 requests/day). "
                "This resets automatically every 24 hours.\n\n"
                "💡 *Tip: To remove this limit, upgrade to a paid Gemini API plan at ai.google.dev*"
            )
        logger.error(f"Gemini chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."
    except Exception as e:
        logger.error(f"Gemini chat response failed: {e}")
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

    full_prompt = f"{system_prompt}\n\n{context_block}\n\nUser Question: {user_message}"

    try:
        return _call_gemini_with_retry(client, "gemini-2.0-flash", full_prompt, temperature=0.6)
    except RuntimeError as e:
        if "RATE_LIMIT_EXHAUSTED" in str(e):
            logger.warning("Gemini free-tier daily quota exhausted for dashboard chat.")
            return (
                "⚠️ **Sporty is temporarily resting!**\n\n"
                "The AI assistant has hit its free-tier daily limit (20 requests/day). "
                "This resets automatically every 24 hours.\n\n"
                "💡 *Tip: To remove this limit, upgrade to a paid Gemini API plan at ai.google.dev*"
            )
        logger.error(f"Gemini dashboard chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."
    except Exception as e:
        logger.error(f"Gemini dashboard chat response failed: {e}")
        return "Sorry, I encountered an error generating a response. Please try again."

