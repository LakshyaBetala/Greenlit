"""
Greenlit — Email Alert Service (Resend)

Sends security alerts when continuous monitoring finds new critical vulnerabilities.
Uses Resend API (https://resend.com) — free tier: 3,000 emails/mo, no credit card.

Setup: pip install resend  (add to requirements.txt)
       Set RESEND_API_KEY in .env
       Set RESEND_FROM_EMAIL in .env (e.g. "alerts@greenlit.dev")
"""
import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY   = os.getenv("RESEND_API_KEY", "")
RESEND_FROM      = os.getenv("RESEND_FROM_EMAIL", "alerts@greenlit.dev")
FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:3000")


def _html_alert(repo_name: str, critical_count: int, report_url: str, vulns: list[dict] | None = None) -> str:
    vuln_rows = ""
    if vulns:
        for v in vulns[:3]:
            sev = v.get("severity", "high").upper()
            color = {"CRITICAL": "#ef4444", "HIGH": "#f97316", "MEDIUM": "#f59e0b"}.get(sev, "#888")
            vuln_rows += f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;font-size:13px;color:#ccc">{v.get('title','Unknown')}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e1e1e;font-size:11px;color:{color};font-weight:600;text-align:right">{sev}</td>
            </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto">
    <tr><td style="padding:0 24px">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr>
          <td>
            <div style="display:inline-flex;align-items:center;gap:8px">
              <div style="width:28px;height:28px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px">🛡</div>
              <span style="font-size:15px;font-weight:600;color:#eee;letter-spacing:-0.03em">greenlit</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Alert banner -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <div style="font-size:11px;font-weight:700;color:#f87171;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">🚨 Security Alert</div>
          <div style="font-size:20px;font-weight:700;color:#eee;letter-spacing:-0.03em;margin-bottom:4px">
            {critical_count} critical {"vulnerability" if critical_count == 1 else "vulnerabilities"} detected
          </div>
          <div style="font-size:13px;color:#888">{repo_name}</div>
        </td></tr>
      </table>

      <!-- Vuln table -->
      {f'''
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:10px;margin-bottom:24px;overflow:hidden">
        <tr style="background:#161616">
          <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#555;letter-spacing:0.05em;text-transform:uppercase">Vulnerability</td>
          <td style="padding:10px 12px;font-size:11px;font-weight:600;color:#555;letter-spacing:0.05em;text-transform:uppercase;text-align:right">Severity</td>
        </tr>
        {vuln_rows}
      </table>''' if vuln_rows else ""}

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr><td style="text-align:center">
          <a href="{report_url}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em">
            View Report &amp; Generate Fix →
          </a>
        </td></tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px solid #1e1e1e;padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#444;margin:0">
            Greenlit Continuous Monitoring · <a href="{FRONTEND_URL}" style="color:#555;text-decoration:none">greenlit.dev</a>
            <br>You're receiving this because you enabled monitoring for {repo_name}.
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>"""


def send_security_alert(
    user_email: str,
    repo_name: str,
    critical_count: int,
    scan_id: str,
    vulnerabilities: list[dict] | None = None,
) -> bool:
    """
    Send a security alert email via Resend.
    Returns True if sent (or simulated), False on hard failure.
    """
    report_url = f"{FRONTEND_URL}/explore?url=https://github.com/{repo_name}&scan={scan_id}"

    subject = f"🚨 {critical_count} critical {'vulnerability' if critical_count == 1 else 'vulnerabilities'} in {repo_name}"
    html    = _html_alert(repo_name, critical_count, report_url, vulnerabilities)

    if not RESEND_API_KEY:
        # Dev mode — log to console, don't fail
        logger.warning(
            "RESEND_API_KEY not set — would have emailed %s: %s",
            user_email, subject,
        )
        return True

    try:
        import resend  # pip install resend
        resend.api_key = RESEND_API_KEY
        response = resend.Emails.send({
            "from":    RESEND_FROM,
            "to":      [user_email],
            "subject": subject,
            "html":    html,
        })
        logger.info("Alert email sent to %s — id: %s", user_email, response.get("id"))
        return True

    except ImportError:
        logger.error("resend package not installed — run: pip install resend")
        return False

    except Exception as exc:
        logger.error("Failed to send alert to %s: %s", user_email, exc)
        return False


def _html_scan_complete(repo_name: str, score: int, vuln_count: int, critical_count: int, report_url: str, simple_explanation: str) -> str:
    score_color = "#22c55e" if score >= 80 else "#f59e0b" if score >= 60 else "#ef4444"
    vuln_line = f"{vuln_count} issue{'' if vuln_count == 1 else 's'} found" if vuln_count else "No issues found"
    if critical_count:
        vuln_line += f" ({critical_count} critical)"
    explanation_block = f"""
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:16px 20px">
          <div style="font-size:11px;font-weight:700;color:#555;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">What your app does</div>
          <p style="font-size:13px;color:#aaa;line-height:1.6;margin:0">{simple_explanation}</p>
        </td></tr>
      </table>""" if simple_explanation else ""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto">
    <tr><td style="padding:0 24px">

      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr><td>
          <div style="display:inline-flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:7px;font-size:14px;text-align:center;line-height:28px">🛡</div>
            <span style="font-size:15px;font-weight:600;color:#eee;letter-spacing:-0.03em">greenlit</span>
          </div>
        </td></tr>
      </table>

      <!-- Score banner -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1e1e1e;border-radius:10px;margin-bottom:24px">
        <tr><td style="padding:20px 24px">
          <div style="font-size:11px;font-weight:700;color:#555;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px">✅ Scan Complete</div>
          <div style="display:flex;align-items:center;gap:16px">
            <div style="font-size:40px;font-weight:800;color:{score_color};letter-spacing:-0.04em;line-height:1">{score}</div>
            <div>
              <div style="font-size:13px;color:#aaa;margin-bottom:2px">Health Score / 100</div>
              <div style="font-size:12px;color:#555">{vuln_line}</div>
            </div>
          </div>
          <div style="margin-top:12px;font-size:13px;color:#666">{repo_name}</div>
        </td></tr>
      </table>

      {explanation_block}

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr><td style="text-align:center">
          <a href="{report_url}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em">
            View Full Report →
          </a>
        </td></tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px solid #1e1e1e;padding-top:20px;text-align:center">
          <p style="font-size:11px;color:#444;margin:0">
            Greenlit Security Scanner · <a href="{FRONTEND_URL}" style="color:#555;text-decoration:none">greenlit.dev</a>
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>"""


def send_scan_complete(
    user_email: str,
    repo_name: str,
    score: int,
    vuln_count: int,
    critical_count: int,
    scan_id: str,
    simple_explanation: str = "",
) -> bool:
    """Send a scan-complete summary email via Resend."""
    report_url = f"{FRONTEND_URL}/explore?url=https://github.com/{repo_name}&scan={scan_id}"
    subject = f"Scan complete: {repo_name} scored {score}/100"
    html = _html_scan_complete(repo_name, score, vuln_count, critical_count, report_url, simple_explanation)

    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — would have emailed %s: %s", user_email, subject)
        return True

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        response = resend.Emails.send({
            "from":    RESEND_FROM,
            "to":      [user_email],
            "subject": subject,
            "html":    html,
        })
        logger.info("Scan-complete email sent to %s — id: %s", user_email, response.get("id"))
        return True
    except ImportError:
        logger.error("resend package not installed — run: pip install resend")
        return False
    except Exception as exc:
        logger.error("Failed to send scan-complete email to %s: %s", user_email, exc)
        return False
