"""
Greenlit — server-side paywall enforcement.

For free-plan callers, the scan response truncates the vulnerabilities
list: the first 5 keep their full details; the rest collapse to
{locked: true} stubs preserving title + severity + file so the
frontend can show "locked — upgrade to see" cards in the right places.

This is the SERVER-side counterpart of the frontend's `isPaywalled`
prop on VulnerabilityList — never trust the client to enforce the gate.

Plan resolution order:
  1. Explicit `plan` argument (passed by caller that already knows)
  2. Auth cookie + user lookup (via /api/auth/me semantics)
  3. Fallback to "free" if anything is missing
"""
from __future__ import annotations

from typing import Optional


PAYWALL_FREE_VISIBLE = 5  # top N findings stay visible on free plan
PAYWALL_FREE_ALLOWED_KEYS = {"title", "severity", "file", "line", "locked"}


def is_paid_plan(plan: Optional[str]) -> bool:
    return (plan or "free").lower() in {"starter", "builder", "pro"}


def gate_report(report: dict, plan: Optional[str]) -> dict:
    """
    Return a copy of `report` with vulnerabilities truncated for free plans.
    No-op for starter / builder / pro plans.

    Does not mutate the input dict. Safe to pass a cached/shared report.
    """
    if not report or not isinstance(report, dict):
        return report
    if is_paid_plan(plan):
        return report

    vulns = report.get("vulnerabilities") or []
    if len(vulns) <= PAYWALL_FREE_VISIBLE:
        return report

    redacted = list(vulns[:PAYWALL_FREE_VISIBLE])
    for v in vulns[PAYWALL_FREE_VISIBLE:]:
        stub = {k: v.get(k) for k in PAYWALL_FREE_ALLOWED_KEYS if k in v}
        stub["locked"] = True
        stub["description"] = "Locked — upgrade to Starter or Builder to read the full finding."
        redacted.append(stub)

    out = dict(report)
    out["vulnerabilities"] = redacted
    out["paywall"] = {
        "applied": True,
        "visible": PAYWALL_FREE_VISIBLE,
        "locked_count": len(vulns) - PAYWALL_FREE_VISIBLE,
        "total": len(vulns),
    }
    return out
