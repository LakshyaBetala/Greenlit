"""
Greenlit — Public Badge & Report API

Public endpoints (no auth required):
  GET /api/public/badge/{repo_id}         → SVG health score badge
  GET /api/public/badge/{repo_id}.svg     → Same, explicit SVG
  GET /api/public/report/{scan_id}        → Public scan report JSON
  GET /api/public/health/{repo_id}        → Health score JSON (for shields.io)

These are the viral loop — every badge on a README drives traffic back.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.database import get_repo_by_id, get_scan, get_scan_history, get_db

router = APIRouter()


def _generate_badge_svg(score: int | None, label: str = "greenlit") -> str:
    """Generate an SVG badge showing the health score."""
    if score is None:
        color = "#555"
        value = "pending"
    elif score >= 76:
        color = "#10b981"
        value = f"{score}/100"
    elif score >= 51:
        color = "#22c55e"
        value = f"{score}/100"
    elif score >= 26:
        color = "#f59e0b"
        value = f"{score}/100"
    else:
        color = "#ef4444"
        value = f"{score}/100"

    label_width = len(label) * 6.5 + 12
    value_width = len(value) * 6.5 + 12
    total_width = label_width + value_width

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="20" role="img" aria-label="{label}: {value}">
  <title>{label}: {value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="{total_width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="{label_width}" height="20" fill="#1a1a2e"/>
    <rect x="{label_width}" width="{value_width}" height="20" fill="{color}"/>
    <rect width="{total_width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="{label_width/2}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{label_width/2}" y="14" fill="#fff">{label}</text>
    <text aria-hidden="true" x="{label_width + value_width/2}" y="15" fill="#010101" fill-opacity=".3">{value}</text>
    <text x="{label_width + value_width/2}" y="14" fill="#fff">{value}</text>
  </g>
</svg>'''


@router.get("/badge/{repo_id}")
@router.get("/badge/{repo_id}.svg")
async def get_badge(repo_id: str):
    """
    Public SVG badge showing the repo's health score.
    Embed in README: ![Greenlit](https://api.greenlit.dev/api/public/badge/{repo_id})
    
    Cache-Control: 5 minutes (badges shouldn't be stale but also shouldn't hammer the DB)
    """
    repo = get_repo_by_id(repo_id)
    if not repo:
        svg = _generate_badge_svg(None, "greenlit")
        return Response(
            content=svg,
            media_type="image/svg+xml",
            headers={"Cache-Control": "no-cache"},
        )

    # Get latest scan score
    history = get_scan_history(repo_id, limit=1)
    score = history[0]["health_score"] if history else None

    svg = _generate_badge_svg(score)

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "max-age=300",  # 5 min cache
            "X-Greenlit-Score": str(score) if score else "pending",
        },
    )


@router.get("/health/{repo_id}")
async def get_health_json(repo_id: str):
    """
    JSON health endpoint — compatible with shields.io custom badges.
    
    Shields.io endpoint: https://img.shields.io/endpoint?url=https://api.greenlit.dev/api/public/health/{repo_id}
    """
    repo = get_repo_by_id(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    history = get_scan_history(repo_id, limit=1)
    score = history[0]["health_score"] if history else None

    # Shields.io endpoint schema
    if score is None:
        color = "lightgrey"
    elif score >= 76:
        color = "brightgreen"
    elif score >= 51:
        color = "green"
    elif score >= 26:
        color = "yellow"
    else:
        color = "red"

    return {
        "schemaVersion": 1,
        "label": "greenlit",
        "message": f"{score}/100" if score is not None else "pending",
        "color": color,
        "namedLogo": "shield",
    }


@router.get("/report/{scan_id}")
async def get_public_report(scan_id: str):
    """
    Public scan report — viewable without authentication.
    Returns the full report JSON for the public report page.
    """
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Fetch repo_name for OG tags
    repo_name = None
    with get_db() as db:
        row = db.execute("SELECT full_name FROM repos WHERE id = ?", (scan["repo_id"],)).fetchone()
        if row:
            repo_name = row["full_name"]

    report = scan.get("report_json", {})
    return {
        "scan_id": scan["id"],
        "repo_name": repo_name,
        "health_score": scan.get("health_score"),
        "vulnerabilities_count": scan.get("vulnerabilities_count", 0),
        "critical_count": scan.get("critical_count", 0),
        "commit_sha": scan.get("commit_sha"),
        "scan_type": scan.get("scan_type"),
        "completed_at": scan.get("completed_at"),
        "report": report if isinstance(report, dict) else {},
    }
