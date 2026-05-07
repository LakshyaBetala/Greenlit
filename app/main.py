import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.auth.github import router as github_auth
from app.api.repos import router as repo_api
from app.api.webhooks import router as webhook_api
from app.api.public import router as public_api
from app.api.stripe import router as stripe_api
from app.api.idea_to_app import router as idea_api
from app.api.blueprints import router as blueprints_api
from app.api.probe import router as probe_api
from app.api.payments import router as payments_api

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Greenlit Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_event():
    from app.uptime_worker import start_uptime_worker
    start_uptime_worker()

_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
_extra = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_allowed_origins = list(dict.fromkeys(_DEV_ORIGINS + _extra))  # dedup, preserve order

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github_auth, prefix="/auth/github")
app.include_router(repo_api, prefix="/api/repos")
app.include_router(webhook_api, prefix="/api/webhooks")
app.include_router(public_api, prefix="/api/public")
app.include_router(stripe_api, prefix="/api/stripe")
app.include_router(idea_api, prefix="/api/idea")
app.include_router(blueprints_api, prefix="/api/blueprints")
app.include_router(probe_api, prefix="/api/probe")
app.include_router(payments_api, prefix="/api/payments")


@app.get("/")
def root():
    return {"status": "Greenlit backend running", "version": "3.0.0"}


@app.get("/health")
def health():
    """Health check endpoint for monitoring."""
    from app.queue import get_active_count
    return {
        "status": "healthy",
        "active_scans": get_active_count(),
    }


if __name__ == "__main__":
    import uvicorn
    # Only watch the `app/` package — keeps reload from firing on cloned repos,
    # chroma temp files, .storage/, etc. that may land inside the project tree.
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        reload_excludes=[".storage/*", "storage/*", "*.pyc", "__pycache__/*"],
    )
