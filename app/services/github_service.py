import httpx

GITHUB_API = "https://api.github.com"

async def get_user_repos(access_token: str):
    headers = {
        # ✅ GitHub now officially supports Bearer
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{GITHUB_API}/user/repos",
            headers=headers,
            params={
                "per_page": 100,   # ✅ avoid default 30 limit
                "sort": "updated",
            },
        )

    # ✅ Explicit error handling (CRITICAL)
    if res.status_code != 200:
        raise Exception(
            f"GitHub API error {res.status_code}: {res.text}"
        )

    repos = res.json()

    # ✅ Defensive parsing
    cleaned_repos = []
    for repo in repos:
        cleaned_repos.append({
            "name": repo.get("name"),
            "full_name": repo.get("full_name"),
            "private": repo.get("private"),
            "clone_url": repo.get("clone_url"),
            "default_branch": repo.get("default_branch"),
            "language": repo.get("language"),
            "description": repo.get("description"),
            "updated_at": repo.get("updated_at"),
        })

    return cleaned_repos
