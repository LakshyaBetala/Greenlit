"""
Greenlit — Database Layer (SQLite for local dev, Supabase-ready schema)
"""
import sqlite3
import json
import uuid
import os
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager

# Database file location — outside the app/ directory to avoid reload triggers
DB_PATH = os.getenv(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".storage", "greenlit.db"),
)
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schema.sql")


def _ensure_db():
    """Create database and tables if they don't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.close()


# Initialize on import
_ensure_db()


def _gen_id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db():
    """Context manager for database connections with row_factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ═══════════════════════════════════════════════
# USER OPERATIONS
# ═══════════════════════════════════════════════

def upsert_user(github_id: int, login: str, name: str = None, avatar_url: str = None, email: str = None) -> dict:
    """Create or update a user from GitHub OAuth data."""
    with get_db() as db:
        existing = db.execute("SELECT * FROM users WHERE github_id = ?", (github_id,)).fetchone()
        if existing:
            db.execute(
                "UPDATE users SET login=?, name=?, avatar_url=?, email=? WHERE github_id=?",
                (login, name, avatar_url, email, github_id),
            )
            user_id = existing["id"]
        else:
            user_id = _gen_id()
            db.execute(
                "INSERT INTO users (id, github_id, login, name, avatar_url, email) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, github_id, login, name, avatar_url, email),
            )
        return dict(db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


def get_user_by_github_id(github_id: int) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE github_id = ?", (github_id,)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def update_user_plan(
    user_id: str,
    plan: str,
    stripe_customer_id: str | None = None,
    razorpay_sub_id: str | None = None,
) -> None:
    """Upgrade or downgrade a user's plan. Called by payment webhooks."""
    with get_db() as db:
        if stripe_customer_id:
            db.execute(
                "UPDATE users SET plan=?, stripe_customer_id=? WHERE id=?",
                (plan, stripe_customer_id, user_id),
            )
        elif razorpay_sub_id:
            db.execute(
                "UPDATE users SET plan=?, razorpay_sub_id=? WHERE id=?",
                (plan, razorpay_sub_id, user_id),
            )
        else:
            db.execute("UPDATE users SET plan=? WHERE id=?", (plan, user_id))


# ═══════════════════════════════════════════════
# REPO OPERATIONS
# ═══════════════════════════════════════════════

def track_repo(user_id: str, github_url: str, name: str, full_name: str) -> dict:
    """Add a repo to the user's tracked list."""
    with get_db() as db:
        existing = db.execute(
            "SELECT * FROM repos WHERE user_id = ? AND github_url = ?",
            (user_id, github_url),
        ).fetchone()
        if existing:
            return dict(existing)

        repo_id = _gen_id()
        db.execute(
            "INSERT INTO repos (id, user_id, github_url, name, full_name, is_monitoring) VALUES (?, ?, ?, ?, ?, 1)",
            (repo_id, user_id, github_url, name, full_name),
        )
        return dict(db.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone())


def get_tracked_repos(user_id: str) -> list[dict]:
    """Get all repos tracked by a user, with latest scan info."""
    with get_db() as db:
        repos = db.execute(
            "SELECT * FROM repos WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()

        result = []
        for repo in repos:
            repo_dict = dict(repo)
            # Get latest scan
            latest = db.execute(
                "SELECT id, health_score, vulnerabilities_count, critical_count, status, created_at "
                "FROM scans WHERE repo_id = ? ORDER BY created_at DESC LIMIT 1",
                (repo_dict["id"],),
            ).fetchone()
            repo_dict["latest_scan"] = dict(latest) if latest else None
            result.append(repo_dict)
        return result


def get_repo_by_id(repo_id: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone()
        return dict(row) if row else None


def get_repo_by_url(github_url: str, user_id: str = None) -> dict | None:
    """Find a repo by URL, optionally scoped to a user."""
    with get_db() as db:
        if user_id:
            row = db.execute(
                "SELECT * FROM repos WHERE github_url = ? AND user_id = ?",
                (github_url, user_id),
            ).fetchone()
        else:
            row = db.execute(
                "SELECT * FROM repos WHERE github_url = ? LIMIT 1",
                (github_url,),
            ).fetchone()
        return dict(row) if row else None


def toggle_monitoring(repo_id: str, enabled: bool) -> dict:
    with get_db() as db:
        db.execute(
            "UPDATE repos SET is_monitoring = ? WHERE id = ?",
            (1 if enabled else 0, repo_id),
        )
        return dict(db.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone())


def untrack_repo(repo_id: str):
    with get_db() as db:
        db.execute("DELETE FROM scans WHERE repo_id = ?", (repo_id,))
        db.execute("DELETE FROM repos WHERE id = ?", (repo_id,))


# ═══════════════════════════════════════════════
# SCAN OPERATIONS
# ═══════════════════════════════════════════════

def create_scan(repo_id: str, scan_type: str = "full") -> dict:
    """Create a new pending scan record."""
    scan_id = _gen_id()
    with get_db() as db:
        db.execute(
            "INSERT INTO scans (id, repo_id, scan_type, status, started_at) VALUES (?, ?, ?, 'pending', ?)",
            (scan_id, repo_id, scan_type, _now()),
        )
        return dict(db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone())


def update_scan_status(scan_id: str, status: str, error: str = None):
    """Update scan status (processing, complete, error)."""
    with get_db() as db:
        if status == "complete":
            db.execute(
                "UPDATE scans SET status = ?, completed_at = ? WHERE id = ?",
                (status, _now(), scan_id),
            )
        elif status == "error":
            db.execute(
                "UPDATE scans SET status = ?, error = ?, completed_at = ? WHERE id = ?",
                (status, error, _now(), scan_id),
            )
        else:
            db.execute("UPDATE scans SET status = ? WHERE id = ?", (status, scan_id))


def update_scan_autofix_pr(scan_id: str, pr_url: str):
    """Save the URL of the generated Auto-Fix PR for a scan."""
    with get_db() as db:
        db.execute("UPDATE scans SET autofix_pr_url = ? WHERE id = ?", (pr_url, scan_id))


def save_scan_result(scan_id: str, report: dict, commit_sha: str = None):
    """Save completed scan results."""
    health_score = report.get("health_score", 0)
    vulns = report.get("vulnerabilities", [])
    vuln_count = len(vulns)
    critical_count = sum(1 for v in vulns if v.get("severity") == "critical")
    high_count = sum(1 for v in vulns if v.get("severity") == "high")
    changelog_summary = report.get("changelog_summary", None)

    with get_db() as db:
        db.execute(
            """UPDATE scans SET
                status = 'complete',
                health_score = ?,
                vulnerabilities_count = ?,
                critical_count = ?,
                high_count = ?,
                commit_sha = ?,
                report_json = ?,
                changelog_summary = ?,
                completed_at = ?
            WHERE id = ?""",
            (health_score, vuln_count, critical_count, high_count,
             commit_sha, json.dumps(report), changelog_summary, _now(), scan_id),
        )
        # Update repo's last_scan_at
        scan = db.execute("SELECT repo_id FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if scan:
            db.execute(
                "UPDATE repos SET last_scan_at = ? WHERE id = ?",
                (_now(), scan["repo_id"]),
            )


def get_scan(scan_id: str) -> dict | None:
    """Get a single scan with its report."""
    with get_db() as db:
        row = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if not row:
            return None
        result = dict(row)
        if result.get("report_json"):
            result["report_json"] = json.loads(result["report_json"])
        return result


def get_scan_history(repo_id: str, limit: int = 20) -> list[dict]:
    """Get scan history for a repo (without full reports)."""
    with get_db() as db:
        rows = db.execute(
            """SELECT id, health_score, vulnerabilities_count, critical_count,
                      commit_sha, scan_type, status, created_at, autofix_pr_url, changelog_summary
               FROM scans WHERE repo_id = ? AND status = 'complete'
               ORDER BY created_at DESC LIMIT ?""",
            (repo_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def get_scan_by_commit(repo_id: str, commit_sha: str) -> dict | None:
    """Check if we've already scanned this commit."""
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM scans WHERE repo_id = ? AND commit_sha = ? AND status = 'complete' LIMIT 1",
            (repo_id, commit_sha),
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        if result.get("report_json"):
            result["report_json"] = json.loads(result["report_json"])
        return result


# ═══════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════

def get_global_stats() -> dict:
    """Get platform-wide stats for the landing page."""
    with get_db() as db:
        total_scans = db.execute("SELECT COUNT(*) FROM scans WHERE status = 'complete'").fetchone()[0]
        total_repos = db.execute("SELECT COUNT(DISTINCT repo_id) FROM scans").fetchone()[0]
        total_vulns = db.execute(
            "SELECT COALESCE(SUM(vulnerabilities_count), 0) FROM scans WHERE status = 'complete'"
        ).fetchone()[0]
        total_criticals = db.execute(
            "SELECT COALESCE(SUM(critical_count), 0) FROM scans WHERE status = 'complete'"
        ).fetchone()[0]
        avg_score_row = db.execute(
            "SELECT AVG(health_score) FROM scans WHERE status = 'complete' AND health_score IS NOT NULL"
        ).fetchone()[0]
        avg_score = round(avg_score_row) if avg_score_row is not None else None
        repos_with_criticals = db.execute(
            """SELECT COUNT(DISTINCT repo_id) FROM scans
               WHERE status = 'complete' AND critical_count > 0"""
        ).fetchone()[0]
        pct_critical = round(repos_with_criticals / total_repos * 100) if total_repos > 0 else 0
        return {
            "total_scans": total_scans,
            "total_repos": total_repos,
            "total_vulnerabilities": total_vulns,
            "total_criticals": total_criticals,
            "avg_health_score": avg_score,
            "pct_repos_with_criticals": pct_critical,
        }


# ═══════════════════════════════════════════════
# CACHE & DEDUPLICATION
# ═══════════════════════════════════════════════

def update_scan_with_cached(scan_id: str, cached_scan: dict):
    """Copy results from a previously cached scan (same commit SHA)."""
    with get_db() as db:
        db.execute(
            """UPDATE scans SET
                status = 'complete',
                health_score = ?,
                vulnerabilities_count = ?,
                critical_count = ?,
                high_count = ?,
                commit_sha = ?,
                report_json = ?,
                completed_at = ?
            WHERE id = ?""",
            (
                cached_scan.get("health_score"),
                cached_scan.get("vulnerabilities_count", 0),
                cached_scan.get("critical_count", 0),
                cached_scan.get("high_count", 0),
                cached_scan.get("commit_sha"),
                json.dumps(cached_scan.get("report_json", {})) if isinstance(cached_scan.get("report_json"), dict) else cached_scan.get("report_json"),
                _now(),
                scan_id,
            ),
        )
        # Update repo's last_scan_at
        scan = db.execute("SELECT repo_id FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if scan:
            db.execute(
                "UPDATE repos SET last_scan_at = ? WHERE id = ?",
                (_now(), scan["repo_id"]),
            )


def get_repo_id_for_scan(scan_id: str) -> str | None:
    """Get the repo_id for a given scan."""
    with get_db() as db:
        row = db.execute("SELECT repo_id FROM scans WHERE id = ?", (scan_id,)).fetchone()
        return row["repo_id"] if row else None


def get_scan_owner_email(scan_id: str) -> tuple[str | None, str | None]:
    """Return (user_email, repo_full_name) for the owner of a scan, or (None, None)."""
    with get_db() as db:
        row = db.execute(
            """SELECT u.email, r.full_name
               FROM scans s
               JOIN repos r ON r.id = s.repo_id
               JOIN users u ON u.id = r.user_id
               WHERE s.id = ?""",
            (scan_id,),
        ).fetchone()
        if not row:
            return None, None
        return row["email"], row["full_name"]

