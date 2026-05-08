"""
Greenlit — Database Layer
SQLite with WAL mode, production-tuned PRAGMAs, and zero N+1 queries.
"""
import sqlite3
import json
import uuid
import os
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager

DB_PATH = os.getenv(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".storage", "greenlit.db"),
)
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schema.sql")


def _apply_pragmas(conn: sqlite3.Connection):
    """Apply production-grade SQLite settings to a connection."""
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA synchronous=NORMAL")       # safe with WAL; faster than FULL
    conn.execute("PRAGMA cache_size=-65536")         # 64 MB page cache
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA mmap_size=268435456")       # 256 MB memory-mapped I/O


def _ensure_db():
    """Create database, tables, and indices if they don't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    _apply_pragmas(conn)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.close()


_ensure_db()


def _gen_id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db():
    """Context manager — auto-commits on success, rolls back on exception."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    _apply_pragmas(conn)
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
    """
    Fetch all repos for a user with their latest scan in a single query.
    Uses a window function (SQLite 3.25+) to avoid N+1 queries.
    """
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM repos WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()

        if not rows:
            return []

        repo_ids = [r["id"] for r in rows]
        placeholders = ",".join(["?"] * len(repo_ids))

        # Single query for all latest scans — window function picks the newest per repo
        scan_rows = db.execute(
            f"""WITH ranked AS (
                  SELECT id, repo_id, health_score, vulnerabilities_count, critical_count,
                         status, created_at,
                         ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at DESC) AS rn
                  FROM scans
                  WHERE repo_id IN ({placeholders})
                )
                SELECT id, repo_id, health_score, vulnerabilities_count, critical_count,
                       status, created_at
                FROM ranked WHERE rn = 1""",
            repo_ids,
        ).fetchall()

        latest_by_repo = {s["repo_id"]: dict(s) for s in scan_rows}

        result = []
        for repo in rows:
            repo_dict = dict(repo)
            repo_dict["latest_scan"] = latest_by_repo.get(repo_dict["id"])
            result.append(repo_dict)
        return result


def get_repo_by_id(repo_id: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone()
        return dict(row) if row else None


def get_repo_by_url(github_url: str, user_id: str = None) -> dict | None:
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
    # ON DELETE CASCADE in schema handles scans deletion
    with get_db() as db:
        db.execute("DELETE FROM repos WHERE id = ?", (repo_id,))


# ═══════════════════════════════════════════════
# SCAN OPERATIONS
# ═══════════════════════════════════════════════

def create_scan(repo_id: str, scan_type: str = "full") -> dict:
    scan_id = _gen_id()
    with get_db() as db:
        db.execute(
            "INSERT INTO scans (id, repo_id, scan_type, status, started_at) VALUES (?, ?, ?, 'pending', ?)",
            (scan_id, repo_id, scan_type, _now()),
        )
        return dict(db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone())


def update_scan_status(scan_id: str, status: str, error: str = None):
    with get_db() as db:
        if status == "complete":
            db.execute(
                "UPDATE scans SET status=?, completed_at=? WHERE id=?",
                (status, _now(), scan_id),
            )
        elif status == "error":
            db.execute(
                "UPDATE scans SET status=?, error=?, completed_at=? WHERE id=?",
                (status, error, _now(), scan_id),
            )
        else:
            db.execute("UPDATE scans SET status=? WHERE id=?", (status, scan_id))


def update_scan_autofix_pr(scan_id: str, pr_url: str):
    with get_db() as db:
        db.execute("UPDATE scans SET autofix_pr_url=? WHERE id=?", (pr_url, scan_id))


def save_scan_result(scan_id: str, report: dict, commit_sha: str = None):
    health_score = report.get("health_score", 0)
    vulns = report.get("vulnerabilities", [])
    vuln_count = len(vulns)
    critical_count = sum(1 for v in vulns if v.get("severity") == "critical")
    high_count = sum(1 for v in vulns if v.get("severity") == "high")
    changelog_summary = report.get("changelog_summary")

    with get_db() as db:
        db.execute(
            """UPDATE scans SET
                status='complete', health_score=?, vulnerabilities_count=?,
                critical_count=?, high_count=?, commit_sha=?, report_json=?,
                changelog_summary=?, completed_at=?
               WHERE id=?""",
            (health_score, vuln_count, critical_count, high_count,
             commit_sha, json.dumps(report), changelog_summary, _now(), scan_id),
        )
        scan = db.execute("SELECT repo_id FROM scans WHERE id=?", (scan_id,)).fetchone()
        if scan:
            db.execute("UPDATE repos SET last_scan_at=? WHERE id=?", (_now(), scan["repo_id"]))


def get_scan(scan_id: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM scans WHERE id=?", (scan_id,)).fetchone()
        if not row:
            return None
        result = dict(row)
        if result.get("report_json"):
            result["report_json"] = json.loads(result["report_json"])
        return result


def get_scan_history(repo_id: str, limit: int = 20) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            """SELECT id, health_score, vulnerabilities_count, critical_count,
                      commit_sha, scan_type, status, created_at, autofix_pr_url, changelog_summary
               FROM scans WHERE repo_id=? AND status='complete'
               ORDER BY created_at DESC LIMIT ?""",
            (repo_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def get_scan_by_commit(repo_id: str, commit_sha: str) -> dict | None:
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM scans WHERE repo_id=? AND commit_sha=? AND status='complete' LIMIT 1",
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
    """All stats in one connection, all aggregates in one pass where possible."""
    with get_db() as db:
        row = db.execute(
            """SELECT
                COUNT(*)                                          AS total_scans,
                COUNT(DISTINCT repo_id)                          AS total_repos,
                COALESCE(SUM(vulnerabilities_count), 0)          AS total_vulnerabilities,
                COALESCE(SUM(critical_count), 0)                 AS total_criticals,
                ROUND(AVG(CASE WHEN health_score IS NOT NULL THEN health_score END)) AS avg_health_score
               FROM scans WHERE status = 'complete'"""
        ).fetchone()

        total_repos = row["total_repos"] or 0
        repos_with_criticals = db.execute(
            "SELECT COUNT(DISTINCT repo_id) FROM scans WHERE status='complete' AND critical_count > 0"
        ).fetchone()[0]
        pct_critical = round(repos_with_criticals / total_repos * 100) if total_repos > 0 else 0

        return {
            "total_scans": row["total_scans"],
            "total_repos": total_repos,
            "total_vulnerabilities": row["total_vulnerabilities"],
            "total_criticals": row["total_criticals"],
            "avg_health_score": int(row["avg_health_score"]) if row["avg_health_score"] is not None else None,
            "pct_repos_with_criticals": pct_critical,
        }


# ═══════════════════════════════════════════════
# CACHE & DEDUPLICATION
# ═══════════════════════════════════════════════

def update_scan_with_cached(scan_id: str, cached_scan: dict):
    with get_db() as db:
        db.execute(
            """UPDATE scans SET
                status='complete', health_score=?, vulnerabilities_count=?,
                critical_count=?, high_count=?, commit_sha=?, report_json=?, completed_at=?
               WHERE id=?""",
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
        scan = db.execute("SELECT repo_id FROM scans WHERE id=?", (scan_id,)).fetchone()
        if scan:
            db.execute("UPDATE repos SET last_scan_at=? WHERE id=?", (_now(), scan["repo_id"]))


def get_repo_id_for_scan(scan_id: str) -> str | None:
    with get_db() as db:
        row = db.execute("SELECT repo_id FROM scans WHERE id=?", (scan_id,)).fetchone()
        return row["repo_id"] if row else None


def get_scan_owner_email(scan_id: str) -> tuple[str | None, str | None]:
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


# ═══════════════════════════════════════════════
# MAINTENANCE
# ═══════════════════════════════════════════════

def cleanup_old_scans(keep_per_repo: int = 10) -> int:
    """
    Delete scan records beyond the most recent `keep_per_repo` per repo.
    Frees disk space from report_json blobs. Returns number of rows deleted.
    """
    with get_db() as db:
        deleted = db.execute(
            """DELETE FROM scans WHERE id IN (
                 SELECT id FROM (
                   SELECT id,
                          ROW_NUMBER() OVER (PARTITION BY repo_id ORDER BY created_at DESC) AS rn
                   FROM scans
                 ) WHERE rn > ?
               )""",
            (keep_per_repo,),
        ).rowcount
        if deleted:
            db.execute("PRAGMA wal_checkpoint(PASSIVE)")
        return deleted


def run_maintenance() -> dict:
    """Run periodic DB maintenance. Call from a scheduled task or startup."""
    deleted = cleanup_old_scans(keep_per_repo=10)
    with get_db() as db:
        db.execute("PRAGMA wal_checkpoint(PASSIVE)")
    return {"deleted_scans": deleted}
