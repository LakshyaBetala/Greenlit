import os
import subprocess
import uuid
from app.config import REPO_STORAGE_PATH

def clone_repo(repo_url: str) -> str:
    """
    Clones a GitHub repo into a unique local directory.
    Returns the absolute local path.
    """
    # Unique folder per clone
    repo_id = str(uuid.uuid4())[:8]
    repo_path = os.path.join(REPO_STORAGE_PATH, repo_id)

    os.makedirs(repo_path, exist_ok=True)

    result = subprocess.run(
        ["git", "clone", "--depth", "1", "--recurse-submodules", "--shallow-submodules", repo_url, repo_path],
        capture_output=True,
        text=True,
        timeout=180,
    )

    if result.returncode != 0:
        raise Exception(f"Git clone failed: {result.stderr}")

    return repo_path


def cleanup_repo(repo_path: str):
    """Remove a cloned repo to free disk space."""
    import shutil
    if os.path.exists(repo_path) and REPO_STORAGE_PATH in repo_path:
        shutil.rmtree(repo_path, ignore_errors=True)
