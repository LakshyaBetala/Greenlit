"""
Greenlit — GitHub OAuth Authentication

Uses FRONTEND_URL and BACKEND_URL from config instead of hardcoded localhost.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from app.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FRONTEND_URL, BACKEND_URL

router = APIRouter()


@router.get("/login")
def github_login():
    """Redirect user to GitHub OAuth consent screen."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env")

    callback_url = f"{BACKEND_URL}/auth/github/callback"
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={callback_url}"
        f"&scope=repo read:user user:email"
    )
    return RedirectResponse(url)


@router.get("/callback")
async def github_callback(code: str):
    """Exchange GitHub auth code for access token, redirect to frontend."""
    if not GITHUB_CLIENT_SECRET:
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=server_not_configured")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )

    data = token_res.json()
    access_token = data.get("access_token")

    if not access_token:
        error = data.get("error", "unknown_error")
        desc = data.get("error_description", "")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={error}&error_description={desc}")

    # Redirect to frontend callback with token in query params
    # TODO Sprint 6: migrate to httpOnly cookie for security
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?access_token={access_token}")
