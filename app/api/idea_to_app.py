import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

class IdeaRequest(BaseModel):
    idea: str
    mode: str = "simple"  # 'simple' or 'advanced'

class IdeaResponse(BaseModel):
    architecture: str
    tech_stack: List[str]
    mega_prompt: str
    github_guide: List[Dict[str, str]]

@router.post("/generate", response_model=IdeaResponse)
async def generate_app_blueprint(payload: IdeaRequest):
    from app.config import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    complexity_prompt = "Keep everything as plain-English and simple as possible. Assume the user has never written code." if payload.mode == "simple" else "Provide a detailed, highly scalable architectural breakdown suitable for a senior developer."

    prompt = f"""You are the world's best CTO. A founder has come to you with an idea.
Your job is to translate their idea into an actionable blueprint for an AI code builder (like Antigravity, Bolt, or Lovable).

THE IDEA:
{payload.idea}

{complexity_prompt}

You must return a JSON object with the following structure:
{{
  "architecture": "A brief explanation of how the app will work.",
  "tech_stack": ["React", "Tailwind", "Supabase", etc...],
  "mega_prompt": "A highly optimized, copy-pasteable prompt that the user can feed into Antigravity or Bolt to generate the MVP perfectly on the first try.",
  "github_guide": [
     {{"step": "Create a GitHub account", "description": "Go to github.com and sign up."}},
     {{"step": "Create a new repository", "description": "Click the + button and select New Repository."}},
     {{"step": "Push the code", "description": "After your AI builder finishes, link your GitHub account and click Push."}}
  ]
}}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Idea Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate blueprint. Please try again.")
