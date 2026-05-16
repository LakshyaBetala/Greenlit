"""
Greenlit — GitHub OAuth Authentication

After the OAuth callback we set TWO surfaces for the token:

  1. An httpOnly Secure SameSite=Lax cookie ("gh_token") — the secure
     primary credential. Cannot be read by JavaScript (XSS-safe).
  2. The existing query-param redirect (?access_token=...) — kept for
     backward compatibility with the current frontend. The frontend can
     migrate to using the cookie + /me endpoint at its own pace.

The /me endpoint accepts either:
  - the gh_token cookie (preferred)
  - an Authorization: Bearer <token> header (legacy path)

Cookie domain follows BACKEND_URL when set; otherwise host-only. In
production over HTTPS the Secure flag is added automatically.
"""
import os
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
import httpx

from app.config import (
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    FRONTEND_URL,
    BACKEND_URL,
)

router = APIRouter()

COOKIE_NAME = "gh_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def _is_secure() -> bool:
    """Cookie should be Secure when we're behind HTTPS."""
    return BACKEND_URL.startswith("https://") or os.getenv("FORCE_SECURE_COOKIES", "") == "1"


def _cookie_domain() -> Optional[str]:
    try:
        host = urlparse(BACKEND_URL).hostname or ""
    except Exception:
        host = ""
    if not host or host in ("localhost", "127.0.0.1"):
        return None
    return host


def _set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=_is_secure(),
        samesite="lax",
        domain=_cookie_domain(),
        path="/",
    )


def _read_token(request: Request) -> Optional[str]:
    """Prefer cookie; fall back to Authorization: Bearer."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(None, 1)[1].strip()
    return None


@router.get("/login")
def github_login():
    """Redirect user to GitHub OAuth consent screen."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env",
        )

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
    """
    Exchange GitHub auth code for access token. Set httpOnly cookie AND
    redirect to the frontend callback with the token in the query string
    (legacy path) so existing client code keeps working.
    """
    if not GITHUB_CLIENT_SECRET:
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error=server_not_configured"
        )

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
        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback?error={error}&error_description={desc}"
        )

    redirect = RedirectResponse(
        f"{FRONTEND_URL}/auth/callback?access_token={access_token}"
    )
    _set_token_cookie(redirect, access_token)
    return redirect


@router.get("/me")
async def github_me(request: Request):
    """
    Return the currently signed-in GitHub user given the cookie or
    Authorization header. Used by the frontend instead of trusting a
    localStorage token blindly. Also upserts the user row so plan
    lookups work.
    """
    token = _read_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with httpx.AsyncClient(timeout=10.0) as client:
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
            },
        )

    if user_res.status_code != 200:
        # Treat as unauthenticated — don't leak GitHub status codes.
        raise HTTPException(status_code=401, detail="Token rejected by GitHub")

    gh = user_res.json()

    # Upsert into our DB so /api/payments/plan + repo tracking work.
    try:
        from app.database import upsert_user, get_user_by_github_id

        user_row = upsert_user(
            github_id=gh["id"],
            login=gh.get("login"),
            name=gh.get("name"),
            avatar_url=gh.get("avatar_url"),
            email=gh.get("email"),
        )
        plan = user_row.get("plan", "free")
    except Exception:
        plan = "free"

    return {
        "id": gh.get("id"),
        "login": gh.get("login"),
        "name": gh.get("name"),
        "email": gh.get("email"),
        "avatar_url": gh.get("avatar_url"),
        "plan": plan,
    }


@router.post("/logout")
async def github_logout():
    """Clear the auth cookie. Frontend should also clear its localStorage cache."""
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie(
        key=COOKIE_NAME,
        domain=_cookie_domain(),
        path="/",
    )
    return resp
