"""
Greenlit — DAST Probe API

POST /api/probe/start    → kicks off async probe, returns probe_id
GET  /api/probe/{probe_id} → poll for results

Now persisted to SQLite (survives server restarts).
"""
import asyncio
import uuid
import json
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.services.dast_service import probe_live_app
from app.database import get_db

router = APIRouter()


class ProbeRequest(BaseModel):
    url: str


async def _run_probe(probe_id: str, url: str):
    try:
        with get_db() as db:
            db.execute("UPDATE probes SET status = 'scanning' WHERE id = ?", (probe_id,))

        result = await probe_live_app(url)

        with get_db() as db:
            db.execute(
                "UPDATE probes SET status = 'complete', result_json = ? WHERE id = ?",
                (json.dumps(result), probe_id),
            )
    except Exception as e:
        with get_db() as db:
            db.execute(
                "UPDATE probes SET status = 'error', error = ? WHERE id = ?",
                (str(e), probe_id),
            )


@router.post("/start")
async def start_probe(body: ProbeRequest, background_tasks: BackgroundTasks):
    """Kick off an async DAST probe. Returns probe_id immediately."""
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=422, detail="URL is required")

    # Normalize
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    probe_id = str(uuid.uuid4())[:8]

    with get_db() as db:
        db.execute(
            "INSERT INTO probes (id, url, status) VALUES (?, ?, 'queued')",
            (probe_id, url),
        )

    background_tasks.add_task(_run_probe, probe_id, url)
    return {"probe_id": probe_id, "status": "queued", "url": url}


@router.get("/{probe_id}")
async def get_probe(probe_id: str):
    """Poll for DAST probe results."""
    with get_db() as db:
        row = db.execute("SELECT * FROM probes WHERE id = ?", (probe_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Probe not found")

    result = dict(row)
    if result.get("result_json"):
        try:
            result["result"] = json.loads(result["result_json"])
        except json.JSONDecodeError:
            result["result"] = None
        del result["result_json"]
    else:
        result["result"] = None

    return result
