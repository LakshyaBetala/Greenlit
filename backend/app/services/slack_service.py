"""
Greenlit — Slack incoming-webhook alert dispatcher.

Pings a configured Slack channel when a continuous-monitoring scan
surfaces a new critical finding. Channel URL is per-repo (stored in
repos.slack_webhook_url) or falls back to the platform-wide default
(SLACK_WEBHOOK_URL env var).

The webhook URL is a credential — never log it.
"""
from __future__ import annotations

import os
import json
from typing import Optional, Sequence

import httpx


PLATFORM_DEFAULT_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "").strip()


def _safe_post(webhook_url: str, payload: dict) -> bool:
    """POST to Slack. Returns True on 2xx, False otherwise. Swallows exceptions."""
    if not webhook_url:
        return False
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(webhook_url, json=payload)
        return 200 <= resp.status_code < 300
    except Exception as exc:
        print(f"WARN: slack webhook post failed: {exc}")
        return False


def send_critical_alert(
    repo_name: str,
    critical_findings: Sequence[dict],
    scan_id: str,
    public_report_url: str,
    repo_webhook: Optional[str] = None,
) -> bool:
    """
    Send a Slack alert when one or more new critical findings appear.
    Returns True if delivered (or at least accepted by Slack).
    """
    target = (repo_webhook or PLATFORM_DEFAULT_WEBHOOK).strip()
    if not target:
        return False

    if not critical_findings:
        return False

    headline = f"{len(critical_findings)} new critical {'exploits' if len(critical_findings) > 1 else 'exploit'} in {repo_name}"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "Greenlit alert", "emoji": False},
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*{headline}*"},
        },
    ]

    for f in critical_findings[:5]:
        title = f.get("title", "Untitled finding")
        file_path = f.get("file") or ""
        description = (f.get("description") or "").strip()
        if len(description) > 240:
            description = description[:237] + "..."

        line = f"*{title}*"
        if file_path:
            line += f"\n`{file_path}`"
        if description:
            line += f"\n{description}"

        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": line}})

    if len(critical_findings) > 5:
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"+{len(critical_findings) - 5} more critical findings",
                    }
                ],
            }
        )

    blocks.append({"type": "divider"})
    blocks.append(
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Open full report"},
                    "url": public_report_url,
                    "style": "primary",
                }
            ],
        }
    )

    payload = {
        "text": headline,
        "blocks": blocks,
    }
    return _safe_post(target, payload)


def send_scan_complete(
    repo_name: str,
    health_score: Optional[int],
    vuln_count: int,
    public_report_url: str,
    repo_webhook: Optional[str] = None,
) -> bool:
    """Optional friendly summary fired on every clean re-scan completion."""
    target = (repo_webhook or PLATFORM_DEFAULT_WEBHOOK).strip()
    if not target:
        return False
    msg = (
        f"Re-scan complete for *{repo_name}*. "
        f"Score: {health_score if health_score is not None else 'n/a'}/100, "
        f"{vuln_count} total findings."
    )
    payload = {
        "text": msg,
        "blocks": [
            {"type": "section", "text": {"type": "mrkdwn", "text": msg}},
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Report"},
                        "url": public_report_url,
                    }
                ],
            },
        ],
    }
    return _safe_post(target, payload)
