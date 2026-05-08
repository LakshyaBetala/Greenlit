"""
Greenlit — Scan Task Functions

These are the actual job functions executed by the queue workers.
Each function is self-contained: clone → analyze → persist → cleanup.
"""
import subprocess
from app.database import update_scan_status, save_scan_result, get_scan_by_commit, update_scan_with_cached, get_repo_id_for_scan, get_scan_owner_email
from app.services.repo_clone import clone_repo, cleanup_repo
from app.services.rag_service import generate_analysis_report


def _get_commit_sha(repo_path: str) -> str | None:
    """Extract HEAD commit SHA from a cloned repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def process_full_scan(scan_id: str, github_url: str):
    """
    Full scan pipeline:
    1. Update status → processing
    2. Clone repo
    3. Check commit SHA cache (skip if unchanged)
    4. Run RAG analysis
    5. Save results to database
    6. Cleanup cloned files
    """
    repo_path = None
    try:
        # Step 1: Mark as processing
        update_scan_status(scan_id, "processing")

        # Step 2: Clone
        repo_path = clone_repo(github_url)

        # Step 3: Check commit cache — skip if same commit already scanned
        commit_sha = _get_commit_sha(repo_path)
        if commit_sha:
            repo_id = get_repo_id_for_scan(scan_id)
            if repo_id:
                cached = get_scan_by_commit(repo_id, commit_sha)
                if cached:
                    print(f"CACHE HIT: Commit {commit_sha[:7]} already scanned → copying results")
                    update_scan_with_cached(scan_id, cached)
                    return

        # Step 4: Run analysis (only if not cached)
        report = generate_analysis_report(repo_path)

        # Step 5: Save results
        save_scan_result(scan_id, report, commit_sha)

        # Step 5b: Email scan-complete summary to repo owner
        try:
            user_email, repo_full_name = get_scan_owner_email(scan_id)
            if user_email and repo_full_name:
                from app.services.email_service import send_scan_complete
                send_scan_complete(
                    user_email=user_email,
                    repo_name=repo_full_name,
                    score=report.get("health_score") or 0,
                    vuln_count=len(report.get("vulnerabilities") or []),
                    critical_count=sum(
                        1 for v in (report.get("vulnerabilities") or [])
                        if v.get("severity") == "critical"
                    ),
                    scan_id=scan_id,
                    simple_explanation=report.get("simple_explanation", ""),
                )
        except Exception as email_err:
            print(f"WARN: scan-complete email failed: {email_err}")

    except Exception as e:
        update_scan_status(scan_id, "error", error=str(e))
    finally:
        # Step 6: Cleanup
        if repo_path:
            try:
                cleanup_repo(repo_path)
            except Exception:
                pass


def process_diff_scan(scan_id: str, github_url: str, changed_files: list = None, commit_sha: str = None):
    """
    Diff scan pipeline — the moat feature.
    Only analyzes changed files instead of the full codebase.
    Uses Gemini Flash Lite (cheaper, faster).
    
    1. Update status → processing
    2. Clone repo (shallow)
    3. Read only the changed files
    4. Send to Gemini with diff-specific prompt
    5. Save delta report to database
    6. Cleanup
    """
    repo_path = None
    try:
        update_scan_status(scan_id, "processing")

        # Clone
        repo_path = clone_repo(github_url)

        # Get actual commit SHA if not provided
        if not commit_sha:
            commit_sha = _get_commit_sha(repo_path)

        # Read only the changed files
        changed_content = _read_changed_files(repo_path, changed_files or [])

        if not changed_content:
            # No readable content — mark as complete with no new issues
            save_scan_result(scan_id, {
                "health_score": None,  # No change
                "vulnerabilities": [],
                "scan_type": "diff",
                "changed_files": changed_files or [],
                "diff_summary": "No analyzable code changes detected.",
            }, commit_sha)
            return

        # Analyze using diff-specific prompt (lighter model)
        report = _analyze_diff_content(changed_content, changed_files or [])

        # Save results
        save_scan_result(scan_id, report, commit_sha)

        critical_count = sum(1 for v in report.get("vulnerabilities", []) if v.get("severity") == "critical")
        if critical_count > 0:
            try:
                from app.services.email_service import send_security_alert
                user_email, repo_full_name = get_scan_owner_email(scan_id)
                if user_email and repo_full_name:
                    send_security_alert(user_email, repo_full_name, critical_count, scan_id)
            except Exception as alert_err:
                print(f"WARN: diff-scan alert email failed: {alert_err}")

        print(f"DIFF SCAN: {github_url} — {len(changed_files or [])} files, "
              f"{len(report.get('vulnerabilities', []))} new issues found")

    except Exception as e:
        update_scan_status(scan_id, "error", error=str(e))
    finally:
        if repo_path:
            try:
                cleanup_repo(repo_path)
            except Exception:
                pass


def _read_changed_files(repo_path: str, changed_files: list) -> str:
    """Read the contents of changed files from the cloned repo."""
    import os

    contents = []
    code_extensions = {
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs',
        '.rb', '.php', '.c', '.cpp', '.h', '.cs', '.swift', '.kt',
        '.sql', '.html', '.css', '.yaml', '.yml', '.json', '.toml',
        '.env', '.sh', '.bash', '.dockerfile', '.tf',
    }

    for file_path in changed_files:
        full_path = os.path.join(repo_path, file_path)
        if not os.path.exists(full_path):
            continue

        # Skip non-code files
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in code_extensions:
            continue

        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            # Cap individual files at 10K chars to stay within token limits
            if len(content) > 10000:
                content = content[:10000] + "\n... [truncated]"
            contents.append(f"=== FILE: {file_path} ===\n{content}")
        except Exception:
            continue

    return "\n\n".join(contents)


def _analyze_diff_content(content: str, changed_files: list) -> dict:
    """
    Analyze diff content using Gemini Flash Lite.
    Returns a lightweight delta report — only new vulnerabilities.
    Skips the full RAG pipeline (no embeddings, no ChromaDB).
    """
    from app.config import GEMINI_API_KEY
    
    api_key = GEMINI_API_KEY
    if not api_key:
        return {
            "health_score": None,
            "vulnerabilities": [],
            "scan_type": "diff",
            "diff_summary": "Demo mode — no API key configured.",
        }

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    prompt = f"""You are a security analyst reviewing code changes in an AI-built application.
The following files were just changed. Check them for NEW security vulnerabilities introduced by these changes.

IMPORTANT: Focus on CONSEQUENCES, not technical jargon.
For each vulnerability, explain what an attacker could DO (e.g., "Anyone can steal your users' passwords")
not just what the bug is (e.g., "SQL injection").

Changed files: {', '.join(changed_files)}

Code changes:
{content}

Return a JSON object with:
1. "vulnerabilities": array of objects with "title", "file", "line" (int or null), "description" (CONSEQUENCE-BASED), "severity" (critical/high/medium/low), "fix_suggestion"
2. "changelog_summary": one sentence summarizing what the developer built or changed, in plain English (e.g. "Added a new Stripe payment gateway and fixed a layout bug").
3. "health_delta": integer from -20 to +10 — how much this change affects the overall health score (negative = worse, positive = better)
4. "scan_type": "diff"

If no issues found, return empty vulnerabilities array and positive health_delta."""

    # Use Flash Lite for diff scans — cheaper, faster, sufficient for focused analysis
    model_candidates = [
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
    ]

    response = None
    last_err = None

    for model_name in model_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            print(f"INFO: Diff scan completed using {model_name}")
            break
        except Exception as e:
            last_err = e
            print(f"WARN: Diff scan call to {model_name} failed: {e}")
            continue

    if response is None:
        return {
            "health_score": None,
            "vulnerabilities": [],
            "scan_type": "diff",
            "diff_summary": f"Analysis failed: {last_err}",
        }

    import json
    try:
        result = json.loads(response.text)
        result["scan_type"] = "diff"
        return result
    except (json.JSONDecodeError, AttributeError):
        return {
            "health_score": None,
            "vulnerabilities": [],
            "scan_type": "diff",
            "diff_summary": "Failed to parse analysis response.",
        }
