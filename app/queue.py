"""
Greenlit — Job Queue (Thread-based for local dev, RQ/Redis-ready interface)

Uses a simple thread pool for local development.
Same API interface as RQ — swap to Redis + RQ by changing this file only.
"""
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any

# Thread pool for background scan jobs
_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="greenlit-worker")

# Track active scans to prevent duplicates: github_url → scan_id
_active_scans: dict[str, str] = {}
_lock = threading.Lock()


def enqueue_scan(scan_id: str, github_url: str, task_fn: Callable, *args, **kwargs):
    """
    Enqueue a scan job. In local mode, runs in thread pool.
    In production, this would push to Redis via RQ.
    """
    with _lock:
        # Prevent duplicate scans of the same URL
        if github_url in _active_scans:
            existing_scan = _active_scans[github_url]
            return existing_scan
        _active_scans[github_url] = scan_id

    def _run():
        try:
            task_fn(scan_id, github_url, *args, **kwargs)
        except Exception as e:
            print(f"ERROR in scan job {scan_id}: {e}")
            traceback.print_exc()
        finally:
            with _lock:
                _active_scans.pop(github_url, None)

    _executor.submit(_run)
    return scan_id


def is_url_scanning(github_url: str) -> str | None:
    """Check if a URL is currently being scanned. Returns scan_id or None."""
    with _lock:
        return _active_scans.get(github_url)


def get_active_count() -> int:
    """Number of currently running scans."""
    with _lock:
        return len(_active_scans)
