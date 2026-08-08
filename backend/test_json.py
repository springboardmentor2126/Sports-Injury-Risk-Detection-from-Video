import json
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

prompt = """
You are a sports scientist AI.
Generate a structured JSON corrective plan based on the following input data.
Risk Level: high
Sport Type: soccer
Active Biomechanical Risk Flags: Knee Valgus detected

Your response must be ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:
{
  "exercise_recommendations": [
    "specific exercise 1 targeting the detected issues",
    "specific exercise 2"
  ],
  "mobility_suggestions": [
    "specific stretch or mobility drill 1"
  ],
  "recovery_planning": [
    "specific recovery step 1"
  ]
}
"""

response = client.models.generate_content(
    model="gemini-flash-latest",
    contents=prompt,
    config=types.GenerateContentConfig(
        temperature=0.4,
        max_output_tokens=600,
        response_mime_type="application/json",
    ),
)
raw = response.text
print("RAW TEXT:")
print(repr(raw))
print("\nATTEMPTING PARSE:")
try:
    print(json.loads(raw))
except Exception as e:
    print("PARSE ERROR:", e)
