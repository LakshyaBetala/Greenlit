import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

class BlueprintRequest(BaseModel):
    repo_id: str

@router.post("/suggest")
async def suggest_blueprints(payload: BlueprintRequest):
    """
    Analyzes a tracked repository's latest tech stack and suggests
    3 logical next features to build, along with the exact Antigravity prompt.
    """
    from app.database import get_db, get_scan
    
    with get_db() as db:
        repo = db.execute("SELECT name, github_url FROM repos WHERE id = ?", (payload.repo_id,)).fetchone()
        if not repo:
            raise HTTPException(status_code=404, detail="Repo not found")
            
        latest_scan_id = db.execute(
            "SELECT id FROM scans WHERE repo_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
            (payload.repo_id,)
        ).fetchone()

    if not latest_scan_id:
        raise HTTPException(status_code=400, detail="No completed scan found to base suggestions on.")
        
    scan = get_scan(latest_scan_id["id"])
    report = scan.get("report_json", {})
    tech_stack = report.get("tech_stack", [])
    
    # Extract just the tool names
    stack_names = [t.get("name") for t in tech_stack] if tech_stack else ["Unknown"]

    from app.config import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""You are the world's best CTO. A non-technical founder has built an app with the following tech stack:
{', '.join(stack_names)}

Suggest EXACTLY 3 logical next features they should add to their app to make it more professional or robust.
For each feature, provide the exact, copy-pasteable "Mega-Prompt" they should give to their AI code builder (like Antigravity or Bolt) to build it.

Return a JSON array of objects with this structure:
[
  {{
    "title": "Add Stripe Payments",
    "description": "Monetize your app by allowing users to subscribe.",
    "mega_prompt": "Add a Stripe checkout integration. Create a /pricing route with a pricing table. When the user clicks subscribe, redirect them to a Stripe checkout session..."
  }}
]
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        suggestions = json.loads(response.text)
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"Blueprint Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate blueprints.")
