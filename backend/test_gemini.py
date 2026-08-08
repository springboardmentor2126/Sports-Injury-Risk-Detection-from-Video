import logging
import sys

logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from app.ml.ai_service import generate_chat_response, generate_static_recommendation

try:
    print("Testing Chat...")
    ctx = {"risk_level": "moderate", "sport_type": "soccer", "active_flags": ["knee_valgus"]}
    resp = generate_chat_response(ctx, "athlete", "What exercises should I do?")
    print("Chat Response:", resp)
except Exception as e:
    print("Chat Error:", repr(e))

try:
    print("\nTesting Recommendation...")
    recs = generate_static_recommendation("high", "soccer", {"knee_valgus": True})
    print("Recommendation Response:", recs)
except Exception as e:
    print("Recommendation Error:", repr(e))
