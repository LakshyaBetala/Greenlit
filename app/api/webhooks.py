"""
Greenlit — GitHub Webhook Receiver

POST /api/webhooks/github
Receives push events from GitHub, verifies signature, and enqueues diff scans.
This is the MOAT — continuous monitoring that makes the product defensible.

Flow:
  GitHub push → Webhook → Verify signature → Find repo in DB → Enqueue diff scan
"""
import hashlib
import hmac
import json
from fastapi import APIRouter, Request, HTTPException, Header
from app.config import GITHUB_WEBHOOK_SECRET
from app.database import get_repo_by_url, create_scan, get_scan_by_commit
from app.queue import enqueue_scan, is_url_scanning

router = APIRouter()


def _verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify the X-Hub-Signature-256 header from GitHub."""
    if not secret or not signature:
        return False
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        payload,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
):
    """
    Receives GitHub webhook events.
    
    Supported events:
      - push: triggers a diff scan on the changed files
      - ping: responds 200 (used by GitHub to verify the webhook)
    
    Must respond within 10 seconds (GitHub timeout).
    All heavy work is enqueued to the job queue.
    """
    body = await request.body()

    # ── Signature Verification ──
    # In development, allow unsigned requests if no secret is configured
    if GITHUB_WEBHOOK_SECRET:
        if not _verify_signature(body, x_hub_signature_256 or "", GITHUB_WEBHOOK_SECRET):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # ── Parse Event ──
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # ── Ping Event (GitHub sends this when you first register a webhook) ──
    if x_github_event == "ping":
        return {"status": "pong", "zen": payload.get("zen", "")}

    # ── Push Event — This is the moat ──
    if x_github_event == "push":
        return await _handle_push(payload)

    # ── Other events — acknowledge but ignore ──
    return {"status": "ignored", "event": x_github_event}


async def _handle_push(payload: dict):
    """
    Process a push event:
    1. Extract repo URL, commit SHA, and changed files
    2. Find the repo in our database
    3. Check if monitoring is enabled
    4. Check commit cache (skip if already scanned)
    5. Enqueue a diff scan
    """
    # Extract data from the push payload
    repo_data = payload.get("repository", {})
    repo_url = repo_data.get("html_url") or repo_data.get("clone_url", "")
    
    # Normalize URL (remove .git suffix)
    repo_url = repo_url.rstrip("/").replace(".git", "")
    
    # Get the head commit SHA
    head_commit = payload.get("head_commit", {})
    commit_sha = head_commit.get("id") or payload.get("after", "")
    
    # Get changed files from ALL commits in the push
    changed_files = set()
    for commit in payload.get("commits", []):
        changed_files.update(commit.get("added", []))
        changed_files.update(commit.get("modified", []))
        # Don't include removed files — they no longer exist
    changed_files = list(changed_files)

    if not repo_url:
        return {"status": "skipped", "reason": "no repo URL in payload"}

    if not changed_files:
        return {"status": "skipped", "reason": "no changed files"}

    # ── Find repo in database ──
    repo = get_repo_by_url(repo_url)
    if not repo:
        # Also try with https://github.com/ prefix variations
        for prefix in ["https://github.com/", "http://github.com/"]:
            full_name = repo_data.get("full_name", "")
            if full_name:
                repo = get_repo_by_url(f"{prefix}{full_name}")
                if repo:
                    break

    if not repo:
        return {"status": "skipped", "reason": f"repo {repo_url} not tracked"}

    # ── Check if monitoring is enabled ──
    if not repo.get("is_monitoring"):
        return {"status": "skipped", "reason": "monitoring disabled for this repo"}

    # ── Check commit cache — skip if already scanned ──
    if commit_sha:
        cached = get_scan_by_commit(repo["id"], commit_sha)
        if cached:
            return {
                "status": "cached",
                "scan_id": cached["id"],
                "message": f"Commit {commit_sha[:7]} already scanned",
            }

    # ── Check if already scanning ──
    existing = is_url_scanning(repo_url)
    if existing:
        return {"status": "in_progress", "scan_id": existing}

    # ── Enqueue diff scan — this is the moat in action ──
    scan = create_scan(repo["id"], scan_type="diff")
    
    from app.tasks import process_diff_scan
    enqueue_scan(
        scan["id"],
        repo_url if repo_url.endswith(".git") else repo_url,
        process_diff_scan,
        changed_files,
        commit_sha,
    )

    print(f"WEBHOOK: Push to {repo_url} ({len(changed_files)} files changed) → diff scan {scan['id']}")

    return {
        "status": "scanning",
        "scan_id": scan["id"],
        "changed_files": len(changed_files),
        "commit": commit_sha[:7] if commit_sha else None,
    }


@router.post("/test")
async def test_webhook():
    """
    Test endpoint to simulate a webhook push event.
    Useful for local development without ngrok.
    
    Usage: POST /api/webhooks/test with a JSON body containing:
      { "github_url": "https://github.com/user/repo" }
    """
    return {
        "status": "test_endpoint_active",
        "message": "Use POST /api/webhooks/github with a real GitHub payload to trigger scans.",
    }
