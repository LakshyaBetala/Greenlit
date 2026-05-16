"""
Greenlit — Public Badge & Report API

Public endpoints (no auth required):
  GET /api/public/badge/{repo_id}         → SVG health score badge
  GET /api/public/badge/{repo_id}.svg     → Same, explicit SVG
  GET /api/public/report/{scan_id}        → Public scan report JSON
  GET /api/public/health/{repo_id}        → Health score JSON (for shields.io)

These are the viral loop — every badge on a README drives traffic back.
"""
import json
from collections import Counter
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from app.database import get_repo_by_id, get_scan, get_scan_history, get_db, get_global_stats, get_user_by_id
from app.services.paywall import gate_report

router = APIRouter()


def _resolve_plan(request: Request) -> str:
    """
    Best-effort plan resolution for the unauthenticated public endpoints.
    Looks at the auth cookie's owner if present; otherwise free.
    """
    # If the user_id is passed via query, trust nothing — just return free.
    # The cookie path is the only authenticated channel.
    token = request.cookies.get("gh_token")
    if not token:
        return "free"
    # Cheap path: we don't re-hit GitHub here. If you want plan info you
    # call /api/auth/me which performs the upsert. Public report defaults to
    # free for cookie-less viewers (shared links from non-signed-in viewers).
    return "free"


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


def _escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _generate_og_svg(repo_name: str, score: int | None, critical: int, vuln_count: int) -> str:
    """1200×630 OG image rendered as SVG — used for link previews on X/LinkedIn."""
    if score is None:
        score_color = "#777777"
        score_text = "—"
    elif score >= 76:
        score_color = "#22c55e"
        score_text = str(score)
    elif score >= 51:
        score_color = "#84cc16"
        score_text = str(score)
    elif score >= 26:
        score_color = "#f59e0b"
        score_text = str(score)
    else:
        score_color = "#ef4444"
        score_text = str(score)

    verdict = (
        "Critical risks found" if critical > 0
        else ("Hardening recommended" if (score or 0) < 76 else "Healthy")
    )
    name = _escape(repo_name or "Unknown repo")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#101510"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{score_color}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="{score_color}" stop-opacity="0.4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="{score_color}"/>
  <g font-family="Inter, system-ui, sans-serif">
    <text x="80" y="120" fill="#777777" font-size="22" letter-spacing="3">GREENLIT · LIVE RED-TEAM REPORT</text>
    <text x="80" y="210" fill="#eeeeee" font-size="56" font-weight="700">{name}</text>
    <text x="80" y="270" fill="{score_color}" font-size="28" font-weight="600">{verdict}</text>

    <g transform="translate(80, 340)">
      <text fill="#777777" font-size="18" letter-spacing="2">HEALTH SCORE</text>
      <text y="90" fill="{score_color}" font-size="120" font-weight="800">{score_text}</text>
      <text x="{len(score_text)*65 + 10}" y="90" fill="#444444" font-size="40" font-weight="600">/ 100</text>
    </g>

    <g transform="translate(720, 340)">
      <rect x="0" y="0" width="380" height="100" rx="12" fill="#161616" stroke="#1e1e1e"/>
      <text x="24" y="38" fill="#777777" font-size="16" letter-spacing="2">CRITICAL FINDINGS</text>
      <text x="24" y="80" fill="#ef4444" font-size="40" font-weight="700">{critical}</text>

      <rect x="0" y="120" width="380" height="100" rx="12" fill="#161616" stroke="#1e1e1e"/>
      <text x="24" y="158" fill="#777777" font-size="16" letter-spacing="2">TOTAL VULNERABILITIES</text>
      <text x="24" y="200" fill="#eeeeee" font-size="40" font-weight="700">{vuln_count}</text>
    </g>

    <text x="80" y="580" fill="#444444" font-size="20">greenlit.dev · live continuous red-team for AI-built apps</text>
  </g>
</svg>'''


@router.get("/og/{scan_id}")
@router.get("/og/{scan_id}.svg")
async def get_og_image(scan_id: str):
    """SVG OG image for /report/{scan_id} link previews."""
    scan = get_scan(scan_id)
    if not scan:
        svg = _generate_og_svg("Scan not found", None, 0, 0)
        return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "no-cache"})

    repo_name = None
    with get_db() as db:
        row = db.execute("SELECT full_name FROM repos WHERE id = ?", (scan["repo_id"],)).fetchone()
        if row:
            repo_name = row["full_name"]

    svg = _generate_og_svg(
        repo_name or "Unknown repo",
        scan.get("health_score"),
        scan.get("critical_count") or 0,
        scan.get("vulnerabilities_count") or 0,
    )
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "max-age=600"},  # 10 min
    )


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
async def get_public_report(scan_id: str, request: Request):
    """
    Public scan report — viewable without authentication.
    Free-plan viewers see top-5 findings; the rest are locked.
    """
    scan = get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Fetch repo_name for OG tags
    repo_name = None
    plan = "free"
    with get_db() as db:
        row = db.execute(
            """SELECT r.full_name, u.plan
                 FROM repos r
                 LEFT JOIN users u ON u.id = r.user_id
                WHERE r.id = ?""",
            (scan["repo_id"],),
        ).fetchone()
        if row:
            repo_name = row["full_name"]
            plan = row["plan"] or "free"

    report = scan.get("report_json", {}) or {}
    if isinstance(report, dict):
        # Paywall gate uses the owning user's plan; non-owner viewers also see
        # the same gated view (intentional — we don't surface paid-content for
        # free repos via shared link).
        report = gate_report(report, plan)

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
        "owner_plan": plan,
    }


@router.get("/breakdown")
async def get_breakdown(limit: int = 200):
    """
    State of Vibe Coding — aggregate vulnerability breakdown across all
    completed public scans. Returns:
      - top vulnerability titles (Counter ordered desc)
      - severity distribution
      - platform distribution
      - the global stats summary

    Limits to the most recent `limit` scans for performance (default 200).
    Marketing page consumes this.
    """
    with get_db() as db:
        rows = db.execute(
            """SELECT report_json FROM scans
               WHERE status='complete' AND report_json IS NOT NULL
               ORDER BY created_at DESC
               LIMIT ?""",
            (max(10, min(limit, 1000)),),
        ).fetchall()

    titles = Counter()
    severities = Counter()
    platforms = Counter()
    total_findings = 0

    for row in rows:
        try:
            report = json.loads(row["report_json"])
        except (TypeError, ValueError):
            continue

        platform = (report.get("platform_detected") or "Unknown").strip() or "Unknown"
        platforms[platform] += 1

        for v in (report.get("vulnerabilities") or []):
            title = (v.get("title") or "Unknown").strip()
            sev = (v.get("severity") or "low").lower()
            if sev not in ("critical", "high", "medium", "low"):
                sev = "low"
            titles[title] += 1
            severities[sev] += 1
            total_findings += 1

    stats = get_global_stats()
    return {
        "global": stats,
        "scans_analyzed": len(rows),
        "total_findings": total_findings,
        "top_vulnerabilities": [
            {"title": t, "count": c} for t, c in titles.most_common(15)
        ],
        "severity_distribution": [
            {"severity": s, "count": severities[s]}
            for s in ("critical", "high", "medium", "low")
        ],
        "platform_distribution": [
            {"platform": p, "count": c} for p, c in platforms.most_common(10)
        ],
    }
