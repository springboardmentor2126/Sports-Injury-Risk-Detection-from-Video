"""
report_writer.py — turns an already-computed injury_risk.RiskAssessment
into a short, natural-language narrative paragraph, using an LLM purely
as a WRITER, never as a decision-maker.

Scope, deliberately narrow: this module NEVER re-derives the score,
level, factors, or recommendation -- those come entirely from
injury_risk.py's transparent, rule-based engine (see that module's
docstring for why there's no trained ML model behind them: no labeled
injury-outcome dataset exists to train one on). All this does is take
numbers/text that are ALREADY decided and ask an LLM to phrase them
more naturally for a human reader than a bullet-point factor list does.

Best-effort, always: if the AI call fails for ANY reason -- no API key
configured, network down, request timeout, rate limited, provider
outage, unexpected response shape -- generate_narrative() returns None
and the rest of the app carries on exactly as it did before this
module existed. The deterministic score/level/factors/recommendation
are ALWAYS available regardless of whether a narrative could be
generated; nothing here is allowed to raise into a caller or block
video processing for long (see REQUEST_TIMEOUT_SECONDS).

Provider + fallback: tries Google's Gemini first (GEMINI_API_KEY env
var -- Google AI Studio's free tier is genuinely no-card and doesn't
expire, see aistudio.google.com/apikey), then falls back to xAI's Grok
(XAI_API_KEY env var, https://api.x.ai) only if Gemini isn't configured
or its call fails. Both are optional independently; if neither is
configured, this module quietly does nothing, since the narrative is a
nice-to-have polish layer, not something the core scoring flow depends
on.

Cost note (confirmed against a real xAI account, not assumed): Grok's
API is NOT usable at all until you add paid credits -- a fresh
account's credit balance is $0.00 and the console shows "Add credits
to start using the API" before any call will succeed; there's no
free-tier API quota the way Gemini has. That's why Gemini is the
primary provider here and Grok is the fallback: if you later add
credits to the xAI account, Grok kicks in automatically as a fallback
with no code change needed; until then, Gemini is what actually runs
at $0 cost.

Model names: LLM model names change often (both providers have
deprecated/retired model IDs multiple times in the past year alone).
GROK_MODEL/GEMINI_MODEL below are read from env vars with a reasonably
current default each, specifically so a future model retirement doesn't
require editing this file -- just set XAI_MODEL/GEMINI_MODEL_NAME in
.env when a default stops working.
"""

import os
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .injury_risk import RiskAssessment

# Keep this short -- it runs inside the video-processing background task
# (or the synchronous manual-refresh endpoint), and a slow/hung AI
# provider should never be allowed to stall either for long.
REQUEST_TIMEOUT_SECONDS = 12

# Defaults current as of mid-2026 -- override via env var if/when either
# provider retires these (check console.x.ai / ai.google.dev for current
# model IDs rather than guessing).
GROK_MODEL = os.getenv("XAI_MODEL", "grok-4.5")
GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME", "gemini-3.6-flash")

_SYSTEM_INSTRUCTIONS = (
    "You are writing a short, plain-language injury-risk summary for an "
    "athlete and their coach, based on numbers and text that have ALREADY "
    "been decided by a separate rule-based system. Do not invent, change, "
    "second-guess, or add to any number, factor, or recommendation given "
    "to you -- your only job is to phrase what's given clearly, in 3-5 "
    "sentences, matching the seriousness of the risk level. Do not add "
    "medical advice beyond what's given. Do not mention that you are an AI "
    "or that this was AI-generated."
)


def _build_prompt(assessment: "RiskAssessment") -> str:
    factor_lines = (
        "\n".join(f"- {f.label}: {f.detail}" for f in assessment.factors)
        or "- No specific risk factors were flagged."
    )
    recommendation = assessment.recommendation
    return (
        f"Risk score: {assessment.score}/100 ({assessment.level})\n"
        f"Primary concern: {assessment.injury_type}\n"
        f"Contributing factors:\n{factor_lines}\n"
        f"Recommendations already decided:\n"
        f"- Posture correction: {recommendation.posture_correction if recommendation else 'n/a'}\n"
        f"- Exercise plan: {recommendation.exercise_plan if recommendation else 'n/a'}\n"
        f"- Recovery plan: {recommendation.recovery_plan if recommendation else 'n/a'}\n"
    )


def _call_grok(prompt: str) -> Optional[str]:
    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        return None
    try:
        import requests

        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": GROK_MODEL,
                "messages": [
                    {"role": "system", "content": _SYSTEM_INSTRUCTIONS},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.4,
                "max_tokens": 300,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"].strip()
        return text or None
    except Exception:
        # Network error, timeout, non-2xx, unexpected JSON shape, whatever
        # -- this is a nice-to-have layer, never let it raise into the
        # caller. generate_narrative() will fall back to Gemini next.
        return None


def _call_gemini(prompt: str) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import requests

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            params={"key": api_key},
            json={
                "system_instruction": {"parts": [{"text": _SYSTEM_INSTRUCTIONS}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 300},
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text or None
    except Exception:
        return None


def generate_narrative(assessment: "RiskAssessment") -> Optional[str]:
    """
    Best-effort: tries Gemini first, falls back to Grok if Gemini isn't
    configured or its call fails, returns None if neither works or
    neither is configured. NEVER raises -- callers can always safely do
    `narrative = generate_narrative(assessment)` and treat None as "no
    AI narrative available this time," the same way injury_risk.py
    treats an unmeasurable biomechanics factor as None rather than
    guessing at a value.

    Priority note (checked in practice, not assumed): Grok's API
    requires adding paid credits before ANY call succeeds -- a fresh
    xAI account's credit balance is $0.00 and the console literally says
    "Add credits to start using the API," signup alone doesn't unlock
    it. Google AI Studio's Gemini free tier, by contrast, is genuinely
    no-card and doesn't expire (1,500 req/day on Flash-class models as
    of mid-2026 -- get a key at aistudio.google.com/apikey). So Gemini
    is primary here for real $0-cost usage; Grok is kept as a fallback
    for if/when XAI_API_KEY has credits behind it, without needing to
    touch this file again.

    Deliberately capped at 2 providers, not N -- more than that adds
    latency (each additional fallback is another full timeout window in
    the worst case) without meaningfully improving reliability once you
    already have a primary + one fallback.
    """
    prompt = _build_prompt(assessment)

    narrative = _call_gemini(prompt)
    if narrative:
        return narrative

    narrative = _call_grok(prompt)
    if narrative:
        return narrative

    return None

