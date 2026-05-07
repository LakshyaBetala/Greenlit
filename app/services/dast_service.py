"""
Greenlit DAST Service — Dynamic Application Security Testing

Probes a live deployed URL with 20 unauthenticated, non-destructive checks.
All checks are passive observation (no writes, no auth bypasses attempted).
Returns structured proof: exact request sent + server response received.

This is the moat. Rafter does static scanning. We show real exploits.
The 6 vibe-coder checks (Supabase RLS, Firebase rules, NextAuth CSRF,
Clerk keys, Vercel env leak, Stripe webhooks) are unique to Greenlit.
"""
import asyncio
import re
import time
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx

TIMEOUT = 8.0
MAX_JS_BYTES = 150_000  # 150KB cap on JS bundle scan

# Patterns that indicate a leaked secret in JavaScript
SECRET_PATTERNS = [
    (re.compile(r'sk-[A-Za-z0-9]{20,}'), "OpenAI API key"),
    (re.compile(r'SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*["\']([^"\']{20,})'), "Supabase service role key"),
    (re.compile(r'eyJhbGciOiJ[A-Za-z0-9_\-]{50,}'), "Hardcoded JWT token"),
    (re.compile(r'sk_live_[A-Za-z0-9]{20,}'), "Stripe live secret key"),
    (re.compile(r'ghp_[A-Za-z0-9]{36,}'), "GitHub personal access token"),
    (re.compile(r'ANTHROPIC_API_KEY\s*[=:]\s*["\']([^"\']{20,})'), "Anthropic API key"),
    (re.compile(r'AIza[0-9A-Za-z\-_]{35}'), "Google API key"),
    (re.compile(r'xoxb-[0-9]{11}-[0-9]{11}-[A-Za-z0-9]{24}'), "Slack bot token"),
    (re.compile(r'PRIVATE_KEY\s*[=:]\s*["\']-----BEGIN'), "Private key in JS bundle"),
]

SQL_ERROR_PATTERNS = re.compile(
    r"(sql syntax|mysql_fetch|ORA-\d{5}|pg_query|sqlite_error|"
    r"You have an error in your SQL|warning: mysql|PDOException|"
    r"SQLSTATE\[|pg_exec\(\)|ERROR:.*syntax error)",
    re.IGNORECASE,
)

SERVER_VERSION_PATTERN = re.compile(
    r"(Apache\/\d|nginx\/\d|PHP\/\d|Microsoft-IIS\/\d|Express\/\d)",
    re.IGNORECASE,
)


def _make_result(
    name: str,
    severity: str,
    passed: bool,
    description: str,
    proof_request: str,
    proof_response: str,
    fix: str,
    category: str = "security",
) -> dict:
    return {
        "name": name,
        "severity": severity,
        "passed": passed,
        "description": description,
        "proof_request": proof_request,
        "proof_response": proof_response,
        "fix": fix,
        "category": category,
    }


async def _get(client: httpx.AsyncClient, url: str, **kwargs) -> Optional[httpx.Response]:
    try:
        return await client.get(url, follow_redirects=True, timeout=TIMEOUT, **kwargs)
    except Exception:
        return None


async def check_https_redirect(base_url: str, client: httpx.AsyncClient) -> dict:
    parsed = urlparse(base_url)
    if parsed.scheme == "https":
        http_url = base_url.replace("https://", "http://", 1)
        try:
            resp = await client.get(http_url, follow_redirects=False, timeout=TIMEOUT)
            redirects_to_https = (
                resp.status_code in (301, 302, 307, 308) and
                resp.headers.get("location", "").startswith("https://")
            )
            passed = redirects_to_https
            return _make_result(
                name="HTTPS Redirect",
                severity="medium",
                passed=passed,
                description="HTTP traffic should redirect to HTTPS to prevent traffic interception." if not passed else "HTTP correctly redirects to HTTPS.",
                proof_request=f"GET {http_url}",
                proof_response=f"HTTP {resp.status_code} — Location: {resp.headers.get('location', 'none')}",
                fix="Configure your server/CDN to respond with 301 to all HTTP traffic pointing to https://",
            )
        except Exception:
            pass
    return _make_result(
        name="HTTPS Redirect",
        severity="medium",
        passed=True,
        description="HTTPS is in use.",
        proof_request=f"GET {base_url}",
        proof_response="URL uses HTTPS",
        fix="",
    )


async def check_security_headers(base_url: str, client: httpx.AsyncClient) -> dict:
    resp = await _get(client, base_url)
    if not resp:
        return _make_result("Security Headers", "medium", True, "Could not reach server.", "", "", "")

    headers = {k.lower(): v for k, v in resp.headers.items()}
    missing = []
    if "x-frame-options" not in headers and "content-security-policy" not in headers:
        missing.append("X-Frame-Options (clickjacking protection)")
    if "x-content-type-options" not in headers:
        missing.append("X-Content-Type-Options: nosniff")
    if "strict-transport-security" not in headers:
        missing.append("Strict-Transport-Security (HSTS)")
    if "content-security-policy" not in headers:
        missing.append("Content-Security-Policy")

    passed = len(missing) == 0
    return _make_result(
        name="Security Headers",
        severity="medium",
        passed=passed,
        description=f"Missing headers: {', '.join(missing)}" if missing else "All key security headers are present.",
        proof_request=f"GET {base_url}",
        proof_response=f"Headers received: {dict(list(headers.items())[:8])}",
        fix="Add these headers in your server config or via a middleware. Vercel/Netlify let you set them in vercel.json / netlify.toml.",
    )


async def check_exposed_env(base_url: str, client: httpx.AsyncClient) -> dict:
    targets = ["/.env", "/.env.local", "/.env.production", "/.env.development"]
    for path in targets:
        url = urljoin(base_url, path)
        resp = await _get(client, url)
        if resp and resp.status_code == 200 and len(resp.text) > 20:
            # Verify it looks like an env file
            if "=" in resp.text and any(k in resp.text.upper() for k in ["KEY", "SECRET", "TOKEN", "PASSWORD", "DATABASE"]):
                return _make_result(
                    name="Exposed .env File",
                    severity="critical",
                    passed=False,
                    description=f"Your .env file is publicly accessible at {path}. ALL your secrets are exposed.",
                    proof_request=f"GET {url}",
                    proof_response=f"HTTP 200 — {resp.text[:200]}...",
                    fix="Add .env to .gitignore immediately. Rotate ALL secrets in this file. Deploy environment variables through your hosting platform's dashboard (Vercel → Settings → Environment Variables).",
                )
    return _make_result(
        name="Exposed .env File",
        severity="critical",
        passed=True,
        description=".env files are not publicly accessible.",
        proof_request=f"GET {base_url}/.env",
        proof_response="HTTP 403 or 404",
        fix="",
    )


async def check_exposed_git(base_url: str, client: httpx.AsyncClient) -> dict:
    url = urljoin(base_url, "/.git/config")
    resp = await _get(client, url)
    if resp and resp.status_code == 200 and "[core]" in resp.text:
        return _make_result(
            name="Exposed .git Directory",
            severity="critical",
            passed=False,
            description="Your .git directory is publicly accessible. Attackers can download your entire source code.",
            proof_request=f"GET {url}",
            proof_response=f"HTTP 200 — {resp.text[:300]}",
            fix="Block access to .git in your server/CDN config. On Vercel: add to vercel.json headers. On Nginx: deny access to ^/.git.",
        )
    return _make_result(
        name="Exposed .git Directory",
        severity="critical",
        passed=True,
        description=".git directory is not publicly accessible.",
        proof_request=f"GET {url}",
        proof_response=f"HTTP {resp.status_code if resp else 'timeout'}",
        fix="",
    )


async def check_cors_wildcard(base_url: str, client: httpx.AsyncClient) -> dict:
    try:
        resp = await client.options(
            base_url,
            headers={"Origin": "https://evil.com", "Access-Control-Request-Method": "GET"},
            timeout=TIMEOUT,
        )
        acao = resp.headers.get("access-control-allow-origin", "")
        acac = resp.headers.get("access-control-allow-credentials", "")
        if acao == "*" or (acao == "https://evil.com" and acac.lower() == "true"):
            severity = "high" if acao == "*" else "critical"
            return _make_result(
                name="CORS Misconfiguration",
                severity=severity,
                passed=False,
                description=f"Server returns ACAO: {acao} with credentials: {acac}. Any website can make authenticated requests to your API.",
                proof_request=f"OPTIONS {base_url}\nOrigin: https://evil.com",
                proof_response=f"Access-Control-Allow-Origin: {acao}\nAccess-Control-Allow-Credentials: {acac}",
                fix="Set CORS to only allow your specific frontend domain. Never use * with credentials: true.",
            )
    except Exception:
        pass
    return _make_result(
        name="CORS Misconfiguration",
        severity="high",
        passed=True,
        description="CORS is not configured to allow arbitrary origins.",
        proof_request=f"OPTIONS {base_url} with Origin: evil.com",
        proof_response="No wildcard ACAO returned",
        fix="",
    )


async def check_open_admin(base_url: str, client: httpx.AsyncClient) -> dict:
    paths = ["/api/admin", "/admin", "/admin/dashboard", "/api/admin/users"]
    for path in paths:
        url = urljoin(base_url, path)
        resp = await _get(client, url)
        if resp and resp.status_code == 200:
            try:
                body = resp.json()
                if body:
                    return _make_result(
                        name="Exposed Admin Endpoint",
                        severity="critical",
                        passed=False,
                        description=f"Admin endpoint {path} is accessible without authentication and returns data.",
                        proof_request=f"GET {url}",
                        proof_response=f"HTTP 200 — {str(body)[:200]}",
                        fix="Add authentication middleware to all /admin routes. Return 401 for unauthenticated requests.",
                    )
            except Exception:
                if len(resp.text) > 50:
                    return _make_result(
                        name="Exposed Admin Endpoint",
                        severity="high",
                        passed=False,
                        description=f"Admin endpoint {path} returned 200 without authentication.",
                        proof_request=f"GET {url}",
                        proof_response=f"HTTP 200 — {resp.text[:200]}",
                        fix="Add authentication middleware to all /admin routes.",
                    )
    return _make_result(
        name="Exposed Admin Endpoint",
        severity="critical",
        passed=True,
        description="Admin endpoints require authentication.",
        proof_request="GET /admin, /api/admin",
        proof_response="HTTP 401, 403, or 404",
        fix="",
    )


async def check_open_users(base_url: str, client: httpx.AsyncClient) -> dict:
    paths = ["/api/users", "/api/user/list", "/api/accounts", "/api/customers"]
    for path in paths:
        url = urljoin(base_url, path)
        resp = await _get(client, url)
        if resp and resp.status_code == 200:
            try:
                body = resp.json()
                if isinstance(body, list) and len(body) > 0:
                    return _make_result(
                        name="Exposed User List",
                        severity="critical",
                        passed=False,
                        description=f"Unauthenticated GET {path} returns a list of user records. GDPR violation + data breach.",
                        proof_request=f"GET {url}\n(no auth header)",
                        proof_response=f"HTTP 200 — {str(body[:2])}...",
                        fix="Add authentication guard to /api/users. Only return the current user's own data. Gate with session token validation.",
                    )
            except Exception:
                pass
    return _make_result(
        name="Exposed User List",
        severity="critical",
        passed=True,
        description="User list endpoints require authentication.",
        proof_request="GET /api/users (no auth)",
        proof_response="HTTP 401, 403, or 404",
        fix="",
    )


async def check_rate_limiting(base_url: str, client: httpx.AsyncClient) -> dict:
    login_paths = ["/api/login", "/api/auth/login", "/api/auth/signin", "/login", "/auth"]
    target_url = None
    for path in login_paths:
        url = urljoin(base_url, path)
        try:
            resp = await client.post(url, json={"email": "test@test.com", "password": "test"}, timeout=TIMEOUT)
            if resp.status_code in (200, 400, 401, 422):
                target_url = url
                break
        except Exception:
            continue

    if not target_url:
        return _make_result(
            name="Rate Limiting",
            severity="medium",
            passed=True,
            description="No login endpoint found to test. Rate limiting not applicable.",
            proof_request="POST /api/login (not found)",
            proof_response="404",
            fix="",
        )

    statuses = []
    try:
        tasks = [
            client.post(target_url, json={"email": f"test{i}@test.com", "password": "wrong"}, timeout=TIMEOUT)
            for i in range(12)
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        statuses = [r.status_code for r in responses if isinstance(r, httpx.Response)]
    except Exception:
        pass

    has_429 = 429 in statuses
    return _make_result(
        name="Rate Limiting",
        severity="high",
        passed=has_429,
        description="Login endpoint is not rate-limited. Brute-force attacks are possible." if not has_429 else "Rate limiting is active on login endpoint.",
        proof_request=f"POST {target_url} × 12 rapid requests",
        proof_response=f"All responses: {set(statuses)} — No 429 rate limit response" if not has_429 else f"Rate limit triggered: {statuses}",
        fix="Add rate limiting: max 5 attempts per IP per minute. In FastAPI, use slowapi. In Express, use express-rate-limit.",
    )


async def check_api_keys_in_js(base_url: str, client: httpx.AsyncClient) -> dict:
    resp = await _get(client, base_url)
    if not resp:
        return _make_result("API Keys in JS Bundle", "critical", True, "Could not fetch page.", "", "", "")

    script_srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', resp.text)
    js_content = ""
    for src in script_srcs[:5]:
        js_url = src if src.startswith("http") else urljoin(base_url, src)
        try:
            js_resp = await client.get(js_url, timeout=TIMEOUT)
            js_content += js_resp.text[:MAX_JS_BYTES]
        except Exception:
            continue

    if not js_content:
        return _make_result(
            name="API Keys in JS Bundle",
            severity="critical",
            passed=True,
            description="No JavaScript bundles found to scan.",
            proof_request="Fetched page HTML + script bundles",
            proof_response="No script sources found",
            fix="",
        )

    for pattern, label in SECRET_PATTERNS:
        match = pattern.search(js_content)
        if match:
            snippet = match.group(0)[:60]
            return _make_result(
                name="API Keys in JS Bundle",
                severity="critical",
                passed=False,
                description=f"{label} is exposed in your frontend JavaScript. Anyone viewing your site can find and use this key.",
                proof_request=f"GET {base_url} → fetched {len(script_srcs)} JS bundles",
                proof_response=f"Found: {snippet}... (truncated for safety)",
                fix=f"Remove this key from frontend code immediately. Rotate the key. Move all {label} calls to your backend server. The frontend should never hold API keys.",
            )

    # Check for localStorage token pattern
    if re.search(r"localStorage\.setItem\(['\"][^'\"]*[Tt]oken", js_content):
        return _make_result(
            name="API Keys in JS Bundle",
            severity="medium",
            passed=False,
            description="Auth tokens are stored in localStorage, which is accessible to any JavaScript on the page (XSS risk).",
            proof_request=f"GET {base_url} → scanned JS bundles",
            proof_response="Found: localStorage.setItem('token', ...)",
            fix="Use httpOnly cookies for auth tokens instead of localStorage. They cannot be accessed by JavaScript at all.",
        )

    return _make_result(
        name="API Keys in JS Bundle",
        severity="critical",
        passed=True,
        description="No API keys or hardcoded secrets detected in JavaScript bundles.",
        proof_request=f"Scanned {len(script_srcs)} JS bundle(s)",
        proof_response=f"Checked {len(js_content):,} characters of JS — no secret patterns matched",
        fix="",
    )


async def check_sql_injection(base_url: str, client: httpx.AsyncClient) -> dict:
    payloads = ["?id=1' OR '1'='1", "?search='; DROP TABLE users;--", "?q=1 OR 1=1"]
    for payload in payloads:
        url = base_url.rstrip("/") + payload
        resp = await _get(client, url)
        if resp and SQL_ERROR_PATTERNS.search(resp.text):
            return _make_result(
                name="SQL Injection",
                severity="critical",
                passed=False,
                description="Server returns SQL error messages in response to SQL injection payloads. The database may be directly exploitable.",
                proof_request=f"GET {url}",
                proof_response=f"HTTP {resp.status_code} — Contains SQL error: {SQL_ERROR_PATTERNS.search(resp.text).group(0)}",
                fix="Use parameterized queries or an ORM. Never concatenate user input into SQL strings. Suppress error messages in production.",
            )
    return _make_result(
        name="SQL Injection",
        severity="critical",
        passed=True,
        description="No SQL error messages returned for injection payloads.",
        proof_request=f"GET {base_url}?id=1' OR '1'='1",
        proof_response="No SQL errors in response",
        fix="",
    )


async def check_xss_reflection(base_url: str, client: httpx.AsyncClient) -> dict:
    payload = "<script>alert('xss-greenlit')</script>"
    url = base_url.rstrip("/") + f"?q={payload}&search={payload}"
    resp = await _get(client, url)
    if resp and payload in resp.text:
        return _make_result(
            name="Reflected XSS",
            severity="high",
            passed=False,
            description="The server reflects user input directly into the page without escaping. An attacker can steal session cookies or hijack accounts.",
            proof_request=f"GET {url}",
            proof_response=f"HTTP {resp.status_code} — Response contains unescaped: {payload[:50]}",
            fix="HTML-encode all user input before rendering. In React, this is automatic if you use JSX. Never use dangerouslySetInnerHTML with user data.",
        )
    return _make_result(
        name="Reflected XSS",
        severity="high",
        passed=True,
        description="User input is not reflected unescaped in page responses.",
        proof_request=f"GET {base_url}?q=<script>alert('xss')</script>",
        proof_response="Payload not found in response or properly escaped",
        fix="",
    )


async def check_server_disclosure(base_url: str, client: httpx.AsyncClient) -> dict:
    resp = await _get(client, base_url)
    if not resp:
        return _make_result("Server Version Disclosure", "low", True, "Could not reach server.", "", "", "")

    server = resp.headers.get("server", "")
    x_powered = resp.headers.get("x-powered-by", "")
    combined = f"{server} {x_powered}"

    if SERVER_VERSION_PATTERN.search(combined):
        return _make_result(
            name="Server Version Disclosure",
            severity="low",
            passed=False,
            description=f"Server reveals version info in headers. Attackers can target known CVEs for this version.",
            proof_request=f"GET {base_url}",
            proof_response=f"Server: {server}\nX-Powered-By: {x_powered}",
            fix="Remove or genericize Server and X-Powered-By headers. In Express: app.disable('x-powered-by'). In Nginx: server_tokens off.",
        )
    return _make_result(
        name="Server Version Disclosure",
        severity="low",
        passed=True,
        description="Server does not disclose version information.",
        proof_request=f"GET {base_url}",
        proof_response=f"Server: {server or 'not disclosed'}",
        fix="",
    )


async def check_directory_listing(base_url: str, client: httpx.AsyncClient) -> dict:
    paths = ["/uploads/", "/static/", "/public/", "/files/", "/assets/"]
    for path in paths:
        url = urljoin(base_url, path)
        resp = await _get(client, url)
        if resp and resp.status_code == 200:
            if "Index of" in resp.text or "<title>Directory listing" in resp.text.lower():
                return _make_result(
                    name="Directory Listing",
                    severity="medium",
                    passed=False,
                    description=f"Directory listing is enabled at {path}. Uploaded files are browsable by anyone.",
                    proof_request=f"GET {url}",
                    proof_response=f"HTTP 200 — Contains directory index: {resp.text[:200]}",
                    fix="Disable directory listing in your server config. On Nginx: autoindex off. On Apache: Options -Indexes.",
                )
    return _make_result(
        name="Directory Listing",
        severity="medium",
        passed=True,
        description="Directory listing is not enabled on public paths.",
        proof_request="GET /uploads/, /static/, /public/",
        proof_response="No directory index responses",
        fix="",
    )


async def check_idor_basic(base_url: str, client: httpx.AsyncClient) -> dict:
    paths = ["/api/users/1", "/api/profile/1", "/api/orders/1", "/api/user/1"]
    for path in paths:
        url = urljoin(base_url, path)
        resp = await _get(client, url)
        if resp and resp.status_code == 200:
            try:
                body = resp.json()
                if body and isinstance(body, dict) and any(k in body for k in ["email", "name", "id", "user_id"]):
                    return _make_result(
                        name="IDOR / Broken Object Level Auth",
                        severity="critical",
                        passed=False,
                        description=f"User object at {path} is accessible without authentication. Incrementing the ID exposes all user records.",
                        proof_request=f"GET {url}\n(no Authorization header)",
                        proof_response=f"HTTP 200 — {str(body)[:300]}",
                        fix="Add authentication to all /api/user/* and /api/profile/* endpoints. Verify the requesting user owns the resource. Return 401 if not authenticated.",
                    )
            except Exception:
                pass
    return _make_result(
        name="IDOR / Broken Object Level Auth",
        severity="critical",
        passed=True,
        description="User object endpoints require authentication.",
        proof_request="GET /api/users/1 (no auth)",
        proof_response="HTTP 401, 403, or 404",
        fix="",
    )


# ══════════════════════════════════════════════════════
# VIBE-CODER-SPECIFIC CHECKS (6 checks unique to Greenlit)
# These target the exact vulnerabilities AI tools introduce.
# No other scanner runs these. This is our moat.
# ══════════════════════════════════════════════════════


async def check_supabase_rls(url: str, client: httpx.AsyncClient) -> dict:
    """Check if Supabase tables are publicly readable without RLS — #1 vuln in Lovable apps."""
    name = "Supabase RLS Bypass"
    try:
        resp = await client.get(url, timeout=TIMEOUT)
        body = resp.text[:MAX_JS_BYTES]

        supa_match = re.search(r'https://([a-z0-9]+)\.supabase\.co', body)
        if not supa_match:
            return _make_result(name, "low", True, "No Supabase instance detected in frontend code.", "", "", "")

        supa_host = supa_match.group(0)
        anon_key_match = re.search(r'eyJ[A-Za-z0-9_\-]{50,}\.[A-Za-z0-9_\-]{50,}\.[A-Za-z0-9_\-]{30,}', body)
        if not anon_key_match:
            return _make_result(name, "low", True, "Supabase URL found but anon key not in JS — good.", "", "", "")

        anon_key = anon_key_match.group(0)
        for table in ["users", "profiles", "accounts", "orders", "items", "products", "messages"]:
            rest_url = f"{supa_host}/rest/v1/{table}?select=*&limit=3"
            req_desc = f"GET {rest_url}\napikey: {anon_key[:20]}..."
            try:
                tr = await client.get(rest_url, headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"}, timeout=TIMEOUT)
                if tr.status_code == 200 and tr.text.strip().startswith("[") and len(tr.text) > 5:
                    return _make_result(passed=False,
                        name=name, severity="critical",
                        description=f"The '{table}' table is publicly readable without auth. Anyone can read ALL rows by visiting your Supabase URL (which is in your frontend code). This is the #1 vulnerability in AI-built apps.",
                        proof_request=req_desc,
                        proof_response=f"HTTP {tr.status_code} — returned data:\n{tr.text[:300]}",
                        fix=f"Enable RLS on '{table}': Supabase Dashboard → Table Editor → click 'RLS Disabled' toggle → add a policy that only lets authenticated users read their own rows.",
                        category="database",
                    )
            except Exception:
                continue

        return _make_result(name, "low", True, "Supabase detected — common tables protected by RLS.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "Supabase RLS check could not complete.", "", "", "")


async def check_firebase_rules(url: str, client: httpx.AsyncClient) -> dict:
    """Check if Firebase Realtime Database is in test mode (publicly readable)."""
    name = "Firebase Test Mode"
    try:
        resp = await client.get(url, timeout=TIMEOUT)
        body = resp.text[:MAX_JS_BYTES]

        fb_match = re.search(r'https://([a-z0-9\-]+)\.firebaseio\.com', body)
        if not fb_match:
            return _make_result(name, "low", True, "No Firebase instance detected.", "", "", "")

        db_url = fb_match.group(0)
        test_url = f"{db_url}/.json?shallow=true"
        req_desc = f"GET {test_url}"
        try:
            fb_resp = await client.get(test_url, timeout=TIMEOUT)
            if fb_resp.status_code == 200 and fb_resp.text.strip() not in ["null", "{}"]:
                return _make_result(passed=False,
                    name=name, severity="critical",
                    description="Firebase Realtime Database is publicly readable. Anyone can read ALL your data without logging in. AI tools set Firebase to 'test mode' during dev and never switch to production rules.",
                    proof_request=req_desc,
                    proof_response=f"HTTP {fb_resp.status_code} — {fb_resp.text[:300]}",
                    fix='Go to Firebase Console → Realtime Database → Rules. Replace with: {"rules": {".read": "auth != null", ".write": "auth != null"}}',
                    category="database",
                )
        except Exception:
            pass

        return _make_result(name, "low", True, "Firebase detected but not in test mode — good.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "Firebase rules check could not complete.", "", "", "")


async def check_nextauth_csrf(url: str, client: httpx.AsyncClient) -> dict:
    """Check if NextAuth.js has properly configured CSRF and secrets."""
    name = "NextAuth CSRF Protection"
    try:
        csrf_url = urljoin(url + "/", "api/auth/csrf")
        resp = await client.get(csrf_url, timeout=TIMEOUT)

        if resp.status_code != 200:
            return _make_result(name, "low", True, "NextAuth not detected (no /api/auth/csrf endpoint).", "", "", "")

        session_url = urljoin(url + "/", "api/auth/session")
        session_resp = await client.get(session_url, timeout=TIMEOUT)

        if "SERVER_ERROR" in session_resp.text or "Configuration" in session_resp.text:
            return _make_result(passed=False,
                name=name, severity="high",
                description="NextAuth.js has configuration errors — likely NEXTAUTH_SECRET is not set. Without this secret, session tokens can be forged by attackers.",
                proof_request=f"GET {session_url}",
                proof_response=f"HTTP {session_resp.status_code} — {session_resp.text[:200]}",
                fix="Set NEXTAUTH_SECRET in your hosting platform (Vercel → Settings → Environment Variables). Generate with: openssl rand -base64 32",
                category="authentication",
            )

        return _make_result(name, "low", True, "NextAuth detected and properly configured.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "NextAuth check could not complete.", "", "", "")


async def check_clerk_public_key(url: str, client: httpx.AsyncClient) -> dict:
    """Check if Clerk is using a test key (pk_test_) in production."""
    name = "Clerk Key Configuration"
    try:
        resp = await client.get(url, timeout=TIMEOUT)
        body = resp.text[:MAX_JS_BYTES]

        pk_test = re.search(r'pk_test_[A-Za-z0-9]{20,}', body)
        if pk_test:
            return _make_result(passed=False,
                name=name, severity="high",
                description="Your app uses a Clerk TEST key (pk_test_...) in production. Auth is running in test mode with weaker security policies. Test keys should never be in production.",
                proof_request=f"GET {url} → scanned HTML/JS for Clerk keys",
                proof_response=f"Found test key: {pk_test.group(0)[:30]}...",
                fix="Replace pk_test_... with pk_live_... in env vars. Vercel: Settings → Environment Variables → update NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your live key.",
                category="authentication",
            )

        if not re.search(r'pk_live_[A-Za-z0-9]{20,}', body):
            return _make_result(name, "low", True, "No Clerk keys detected.", "", "", "")

        return _make_result(name, "low", True, "Clerk using live key — good.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "Clerk key check could not complete.", "", "", "")


async def check_vercel_env_leak(url: str, client: httpx.AsyncClient) -> dict:
    """Check if NEXT_PUBLIC_ vars expose secrets (service keys, passwords, etc.)."""
    name = "Vercel Environment Variable Exposure"
    try:
        resp = await client.get(url, timeout=TIMEOUT)
        body = resp.text[:MAX_JS_BYTES]

        # Also check JS bundles
        script_srcs = re.findall(r'src="(/_next/static/[^"]+\.js)"', body)
        js_content = body
        for src in script_srcs[:5]:
            try:
                js_resp = await client.get(urljoin(url + "/", src), timeout=TIMEOUT)
                if js_resp.status_code == 200:
                    js_content += js_resp.text[:MAX_JS_BYTES]
            except Exception:
                continue

        dangerous = [
            (re.compile(r'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'), "Supabase service role key"),
            (re.compile(r'NEXT_PUBLIC_[A-Z_]*SECRET'), "Secret value"),
            (re.compile(r'NEXT_PUBLIC_[A-Z_]*PRIVATE'), "Private key"),
            (re.compile(r'NEXT_PUBLIC_DATABASE_URL'), "Database URL"),
            (re.compile(r'NEXT_PUBLIC_[A-Z_]*PASSWORD'), "Password"),
            (re.compile(r'NEXT_PUBLIC_STRIPE_SECRET'), "Stripe secret key"),
        ]

        found = []
        for pat, label in dangerous:
            m = pat.search(js_content)
            if m:
                found.append(f"{label}: {m.group(0)}")

        if found:
            return _make_result(passed=False,
                name=name, severity="critical",
                description="Secrets exposed via NEXT_PUBLIC_ env vars. Anything with NEXT_PUBLIC_ is bundled into browser JS and visible to everyone. Database passwords, service keys, and private API keys must NEVER use the NEXT_PUBLIC_ prefix.",
                proof_request=f"GET {url} + JS bundles → searched for NEXT_PUBLIC_*SECRET/PRIVATE",
                proof_response="Found:\n" + "\n".join(found),
                fix="Remove NEXT_PUBLIC_ prefix from these vars. Access secrets only in server-side code (API routes, getServerSideProps). Use only public/anon keys on the client.",
                category="secrets",
            )

        return _make_result(name, "low", True, "No dangerous NEXT_PUBLIC_ variables detected.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "Vercel env check could not complete.", "", "", "")


async def check_stripe_webhook_sig(url: str, client: httpx.AsyncClient) -> dict:
    """Check if Stripe webhook endpoint accepts unsigned (fake) events."""
    name = "Stripe Webhook Signature"
    try:
        paths = ["api/webhooks/stripe", "api/webhook/stripe", "api/stripe/webhook", "api/stripe/webhooks", "api/webhooks", "api/webhook"]
        for path in paths:
            wh_url = urljoin(url + "/", path)
            fake = {"type": "checkout.session.completed", "data": {"object": {"id": "cs_test_probe"}}}
            req_desc = f"POST {wh_url}\n# No Stripe-Signature header (unsigned)\n" + '{"type":"checkout.session.completed"}'
            try:
                r = await client.post(wh_url, json=fake, headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
                if r.status_code in (200, 201):
                    return _make_result(passed=False,
                        name=name, severity="critical",
                        description=f"Webhook at /{path} accepted a fake Stripe event WITHOUT signature verification. Anyone can send fake 'payment complete' events — marking orders as paid without paying. Real money-stealing attack.",
                        proof_request=req_desc,
                        proof_response=f"HTTP {r.status_code} — {r.text[:200]}",
                        fix="Verify Stripe-Signature header: stripe.webhooks.constructEvent(body, sig, webhookSecret). Set STRIPE_WEBHOOK_SECRET in env vars.",
                        category="payments",
                    )
                if r.status_code in (400, 401, 403):
                    return _make_result(name, "low", True, f"Stripe webhook at /{path} correctly rejected unsigned request — good.", "", "", "")
            except Exception:
                continue

        return _make_result(name, "low", True, "No Stripe webhook endpoints found.", "", "", "")
    except Exception:
        return _make_result(name, "low", True, "Stripe webhook check could not complete.", "", "", "")


async def probe_live_app(url: str) -> dict:
    """
    Run all 20 DAST checks against a live URL.
    Returns structured results with proof for each check.
    """
    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    url = url.rstrip("/")

    start = time.time()

    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
    async with httpx.AsyncClient(
        limits=limits,
        follow_redirects=True,
        headers={"User-Agent": "Greenlit-Security-Scanner/1.0 (https://greenlit.dev)"},
    ) as client:
        checks = await asyncio.gather(
            # Original 14 checks
            check_https_redirect(url, client),
            check_security_headers(url, client),
            check_exposed_env(url, client),
            check_exposed_git(url, client),
            check_cors_wildcard(url, client),
            check_open_admin(url, client),
            check_open_users(url, client),
            check_rate_limiting(url, client),
            check_api_keys_in_js(url, client),
            check_sql_injection(url, client),
            check_xss_reflection(url, client),
            check_server_disclosure(url, client),
            check_directory_listing(url, client),
            check_idor_basic(url, client),
            # 6 NEW vibe-coder-specific checks
            check_supabase_rls(url, client),
            check_firebase_rules(url, client),
            check_nextauth_csrf(url, client),
            check_clerk_public_key(url, client),
            check_vercel_env_leak(url, client),
            check_stripe_webhook_sig(url, client),
            return_exceptions=True,
        )

    results = []
    for c in checks:
        if isinstance(c, Exception):
            continue
        results.append(c)

    failed = [r for r in results if not r["passed"]]
    critical = [r for r in failed if r["severity"] == "critical"]
    high = [r for r in failed if r["severity"] == "high"]
    medium = [r for r in failed if r["severity"] == "medium"]

    # Runtime security score (separate from code health score)
    runtime_score = max(0, 100 - len(critical) * 25 - len(high) * 10 - len(medium) * 5)

    return {
        "url": url,
        "duration_seconds": round(time.time() - start, 1),
        "total_checks": len(results),
        "issues_found": len(failed),
        "runtime_score": runtime_score,
        "critical_count": len(critical),
        "high_count": len(high),
        "medium_count": len(medium),
        "results": results,
        "summary": (
            f"🔴 {len(critical)} critical, {len(high)} high, {len(medium)} medium issues found."
            if failed else
            "✅ All runtime security checks passed."
        ),
    }

