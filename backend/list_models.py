from dotenv import load_dotenv
load_dotenv()
from google import genai
import os

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    for m in client.models.list():
        print(f" - {m.name}")
except Exception as e:
    print("Error listing models:", repr(e))
