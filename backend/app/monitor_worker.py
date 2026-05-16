"""
Greenlit — Continuous Monitoring Worker

Async loop that periodically re-scans every repo with `is_monitoring=1`
whose `last_scan_at` is older than MONITOR_REFRESH_HOURS. The webhook
path already covers push-driven diff scans; this worker is the safety
net for repos whose webhooks were never installed (or fired, or were
silently dropped) — so users on the Starter/Builder plans still get the
"live continuous red-team" promise.

Design choices:
- Runs in the same asyncio loop as `uptime_worker` (started from the
  FastAPI startup event). Cheap: one SQLite query + a handful of
  thread-pool submissions per cycle.
- Uses `enqueue_scan` rather than running the pipeline inline so the
  worker stays non-blocking and respects the global concurrency cap
  (3 workers).
- Defers to `_active_scans` dedup in `queue.py` — if a webhook already
  kicked a scan for the same URL, we skip without double-queueing.
- Skips repos owned by users on the `free` plan (continuous monitoring
  is a paid feature; advertised on the pricing page).
"""

import asyncio
import os
from datetime import datetime, timezone, timedelta

from app.database import get_db, create_scan
from app.queue import enqueue_scan, is_url_scanning
from app.tasks import process_full_scan


# How often the loop wakes up. Each wake re-evaluates which repos are due.
MONITOR_TICK_SECONDS = int(os.getenv("MONITOR_TICK_SECONDS", "3600"))  # 1h

# A repo is "due" if it has not been scanned in this many hours.
MONITOR_REFRESH_HOURS = int(os.getenv("MONITOR_REFRESH_HOURS", "24"))

# How many monitored repos to dispatch per tick — keeps cold mornings
# from saturating the worker pool.
MONITOR_BATCH_SIZE = int(os.getenv("MONITOR_BATCH_SIZE", "10"))


_PAID_PLANS = {"starter", "builder", "pro"}


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        s = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _select_due_repos() -> list[dict]:
    """
    Return monitored repos whose owner is on a paid plan and whose
    last scan is older than the refresh window (or never scanned).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=MONITOR_REFRESH_HOURS)
    with get_db() as db:
        rows = db.execute(
            """SELECT r.id, r.github_url, r.full_name, r.last_scan_at, u.plan
                 FROM repos r
                 LEFT JOIN users u ON u.id = r.user_id
                WHERE r.is_monitoring = 1
                ORDER BY (r.last_scan_at IS NULL) DESC, r.last_scan_at ASC
                LIMIT ?""",
            (MONITOR_BATCH_SIZE * 4,),  # over-fetch, we'll filter
        ).fetchall()

    due: list[dict] = []
    for row in rows:
        plan = (row["plan"] or "free").lower()
        if plan not in _PAID_PLANS:
            continue
        last = _parse_dt(row["last_scan_at"])
        if last is not None and last > cutoff:
            continue
        due.append(dict(row))
        if len(due) >= MONITOR_BATCH_SIZE:
            break
    return due


async def monitor_tracked_repos():
    """Wake every MONITOR_TICK_SECONDS, enqueue due scans."""
    # First tick: small delay so we don't compete with startup IO.
    await asyncio.sleep(30)

    while True:
        try:
            due = _select_due_repos()
            if due:
                print(f"MONITOR: {len(due)} repo(s) due for re-scan")
            for repo in due:
                github_url = repo["github_url"]
                # Respect queue dedup — skip if already being scanned.
                if is_url_scanning(github_url):
                    continue
                try:
                    scan = create_scan(repo["id"], scan_type="full")
                    enqueue_scan(scan["id"], github_url, process_full_scan)
                    print(f"MONITOR: queued {repo.get('full_name') or github_url} → scan {scan['id']}")
                except Exception as enq_err:
                    print(f"MONITOR: failed to queue {github_url}: {enq_err}")
        except Exception as e:
            print(f"Monitor worker error: {e}")

        await asyncio.sleep(MONITOR_TICK_SECONDS)


def start_monitor_worker():
    asyncio.ensure_future(monitor_tracked_repos())
