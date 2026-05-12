"""
Greenlit — Repository API Endpoints

Routes:
  POST /api/repos/analyze-url        → One-step scan (paste URL, get report)
  GET  /api/repos/jobs/{scan_id}     → Poll scan status
  GET  /api/repos/stats              → Global platform stats
  GET  /api/repos/monitored          → User's tracked repos
  POST /api/repos/track              → Add repo to monitoring
  DELETE /api/repos/{id}/track       → Remove repo from monitoring
  POST /api/repos/{id}/scan          → Trigger manual re-scan
  GET  /api/repos/{id}/history       → Scan history for a repo
  GET  /api/repos/{id}/report/{sid}  → Specific scan report
  GET  /api/repos/                   → GitHub repo listing (legacy)
  POST /api/repos/autofix            → Auto-fix PR generation
  POST /api/repos/chat               → AI Sidekick chat
"""
import re
import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any, Optional

limiter = Limiter(key_func=get_remote_address)

_GITHUB_URL_RE = re.compile(r"^https://github\.com/[\w.\-]+/[\w.\-]+(\.git)?/?$")
from app.services.github_service import get_user_repos
from app.services.autofix_service import generate_and_apply_fix
from app.services.chat_service import chat_with_codebase
from app.database import (
    create_scan, get_scan, get_scan_history, get_scan_by_commit,
    track_repo, get_tracked_repos, get_repo_by_id, get_repo_by_url,
    toggle_monitoring, untrack_repo, get_global_stats, upsert_user,
)
from app.queue import enqueue_scan, is_url_scanning
from app.tasks import process_full_scan

router = APIRouter()


async def _verify_token(authorization: Optional[str]) -> dict:
    """Verify a GitHub Bearer token and return the internal user record. Raises 401 if missing or invalid."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        )
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")
    g = res.json()
    return upsert_user(
        github_id=g["id"],
        login=g["login"],
        name=g.get("name"),
        avatar_url=g.get("avatar_url"),
        email=g.get("email"),
    )


# ── Request Models ─────────────────────────────

class AnalyzeUrlRequest(BaseModel):
    github_url: str

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip()
        if not _GITHUB_URL_RE.match(v):
            raise ValueError("github_url must be a valid https://github.com/owner/repo URL")
        return v


class TrackRepoRequest(BaseModel):
    github_url: str
    name: Optional[str] = None
    full_name: Optional[str] = None

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip()
        if not _GITHUB_URL_RE.match(v):
            raise ValueError("github_url must be a valid https://github.com/owner/repo URL")
        return v

class AutoFixRequest(BaseModel):
    repo_name: str
    vulnerabilities: List[Dict[str, Any]]
    scan_id: Optional[str] = None
    github_token: Optional[str] = None  # user's token; falls back to GITHUB_TOKEN env var

class ChatRequest(BaseModel):
    question: str
    report: Dict[str, Any] = {}


# ── One-Step Analyze (Paste-and-Go) ────────────

@router.post("/analyze-url")
@limiter.limit("10/minute")
async def analyze_from_url(request: Request, payload: AnalyzeUrlRequest):
    """
    One-step: paste a GitHub URL → clone + analyze.
    Deduplicates: if same URL is already scanning, returns existing scan_id.
    Results are persisted to the database.
    """
    url = payload.github_url.strip()

    # Deduplicate: if this URL is already being scanned
    existing_scan_id = is_url_scanning(url)
    if existing_scan_id:
        return {
            "status": "processing",
            "scan_id": existing_scan_id,
            "message": "Analysis already in progress. Poll /jobs/{scan_id} for results.",
        }

    # Find or create a repo record (anonymous scan — no user_id)
    repo = get_repo_by_url(url)
    if not repo:
        # Extract name from URL
        parts = url.rstrip("/").split("/")
        name = parts[-1] if parts else "unknown"
        full_name = "/".join(parts[-2:]) if len(parts) >= 2 else name
        repo = track_repo(
            user_id=None,
            github_url=url,
            name=name.replace(".git", ""),
            full_name=full_name.replace(".git", ""),
        )

    # Create scan record
    scan = create_scan(repo["id"], scan_type="full")
    scan_id = scan["id"]

    # Enqueue the scan job
    enqueue_scan(scan_id, url, process_full_scan)

    return {
        "status": "processing",
        "scan_id": scan_id,
        "job_id": scan_id,  # backward compatibility
        "message": "Clone and analysis started. Poll /jobs/{scan_id} for results.",
    }


# ── Job Polling ────────────────────────────────

@router.get("/jobs/{scan_id}")
async def get_job_status(scan_id: str):
    """Poll scan status from database."""
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Map to the response format the frontend expects
    if scan["status"] == "complete":
        report = scan.get("report_json") or {}
        # Inject IDs needed for sharing
        report["scan_id"] = scan_id
        report["repo_id"] = scan["repo_id"]
        report["autofix_pr_url"] = scan.get("autofix_pr_url")
        return {
            "status": "complete",
            "result": report,
        }
    elif scan["status"] == "error":
        return {
            "status": "error",
            "error": scan.get("error", "Analysis failed."),
        }
    else:
        return {
            "status": "processing",
            "result": None,
        }


# ── Platform Stats ─────────────────────────────

@router.get("/stats")
async def platform_stats(request: Request):
    from fastapi.responses import JSONResponse
    data = get_global_stats()
    response = JSONResponse(content=data)
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return response


# ── Monitored Repos (Authenticated) ───────────

@router.get("/monitored")
async def list_monitored_repos(authorization: str = Header(None)):
    """List all repos tracked by the authenticated user."""
    user = await _verify_token(authorization)
    repos = get_tracked_repos(user["id"])
    return repos


@router.post("/track")
async def track_repository(payload: TrackRepoRequest, authorization: str = Header(None)):
    """Add a repo to the authenticated user's tracked list."""
    user = await _verify_token(authorization)

    url = payload.github_url.strip()
    parts = url.rstrip("/").split("/")
    name = payload.name or (parts[-1].replace(".git", "") if parts else "unknown")
    full_name = payload.full_name or ("/".join(parts[-2:]).replace(".git", "") if len(parts) >= 2 else name)

    repo = track_repo(user["id"], url, name, full_name)
    return repo


@router.delete("/{repo_id}/track")
async def untrack_repository(repo_id: str, authorization: str = Header(None)):
    """Remove a repo from monitoring — verifies ownership."""
    user = await _verify_token(authorization)
    repo = get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    if repo["user_id"] != user["id"] and repo["user_id"] != "anonymous":
        raise HTTPException(status_code=403, detail="Not your repo")
    untrack_repo(repo_id)
    return {"status": "removed"}


class MonitoringToggleRequest(BaseModel):
    enabled: bool


@router.patch("/{repo_id}/monitoring")
async def toggle_repo_monitoring(repo_id: str, payload: MonitoringToggleRequest, authorization: str = Header(None)):
    """Enable or disable continuous monitoring — verifies ownership."""
    user = await _verify_token(authorization)
    repo = get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    if repo["user_id"] != user["id"] and repo["user_id"] != "anonymous":
        raise HTTPException(status_code=403, detail="Not your repo")
    toggle_monitoring(repo_id, payload.enabled)
    return {"status": "ok", "is_monitoring": payload.enabled}


@router.post("/{repo_id}/scan")
async def trigger_scan(repo_id: str, authorization: str = Header(None)):
    """Manually trigger a new scan — verifies ownership."""
    user = await _verify_token(authorization)
    repo = get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    if repo["user_id"] != user["id"] and repo["user_id"] != "anonymous":
        raise HTTPException(status_code=403, detail="Not your repo")

    # Check if already scanning
    existing = is_url_scanning(repo["github_url"])
    if existing:
        return {"status": "processing", "scan_id": existing}

    scan = create_scan(repo_id, scan_type="full")
    enqueue_scan(scan["id"], repo["github_url"], process_full_scan)

    return {"status": "processing", "scan_id": scan["id"]}


@router.get("/{repo_id}/history")
async def repo_scan_history(repo_id: str):
    """Get scan history for a repo."""
    repo = get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
    return get_scan_history(repo_id)


@router.get("/{repo_id}/report/{scan_id}")
async def get_scan_report(repo_id: str, scan_id: str):
    """Get a specific scan report."""
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


# ── Global Benchmarking ───────────────────────

@router.get("/{repo_id}/benchmark")
async def get_repo_benchmark(repo_id: str):
    """
    Calculate the global percentile ranking of this repository's 
    latest health score compared to all other tracked repos.
    """
    from app.database import get_db
    
    with get_db() as db:
        # Get the latest score for this repo
        latest = db.execute(
            "SELECT health_score FROM scans WHERE repo_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
            (repo_id,)
        ).fetchone()
        
        if not latest or latest["health_score"] is None:
            return {"percentile": None, "message": "No score available to benchmark."}
            
        repo_score = latest["health_score"]
        
        # Get all distinct latest scores for all other repos
        all_scores = db.execute(
            """
            SELECT health_score FROM (
                SELECT health_score, ROW_NUMBER() OVER(PARTITION BY repo_id ORDER BY created_at DESC) as rn
                FROM scans
                WHERE status = 'complete' AND health_score IS NOT NULL
            ) WHERE rn = 1
            """
        ).fetchall()
        
    scores = [row["health_score"] for row in all_scores]
    if not scores:
        return {"percentile": 100, "score": repo_score, "total_apps": 1}
        
    # Calculate how many scores are STRICTLY LESS than the repo's score
    lower_scores = sum(1 for s in scores if s < repo_score)
    percentile = (lower_scores / len(scores)) * 100
    
    # We want to display "Top X%", so we invert the percentile
    top_percent = max(1, min(99, 100 - int(percentile)))
    
    return {
        "percentile": top_percent,
        "score": repo_score,
        "total_apps": len(scores)
    }


# ── GitHub Repo Listing (Legacy) ──────────────

@router.get("/")
async def list_repos(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    repos = await get_user_repos(token)
    return repos


# ── Auto-Fix (Paid Tier) ──────────────────────

@router.post("/autofix")
async def autofix_vulnerabilities(payload: AutoFixRequest, authorization: str = Header(None)):
    """Auto-Fix PR generation — marked as paid tier."""
    from app.database import update_scan_autofix_pr
    # Prefer user token from payload, then Authorization header, then env var
    user_token = (
        payload.github_token
        or (authorization.replace("Bearer ", "") if authorization else None)
    )
    try:
        pr_url = generate_and_apply_fix(payload.repo_name, payload.vulnerabilities, user_token)
        if payload.scan_id and pr_url and "error-" not in pr_url and "mock-" not in pr_url:
            update_scan_autofix_pr(payload.scan_id, pr_url)

        return {
            "status": "success",
            "pr_url": pr_url,
            "message": "Auto-Fix PR generated successfully.",
            "tier": "paid",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI Sidekick Chat ───────────────────────────

@router.post("/chat")
@limiter.limit("20/minute")
async def chat_with_sidekick(request: Request, payload: ChatRequest):
    """AI Sidekick: answers questions about the analyzed codebase."""
    import asyncio
    try:
        answer = await asyncio.to_thread(chat_with_codebase, payload.question, payload.report)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))