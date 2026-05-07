# Greenlit

**CTO in a box for AI-built apps.**

Greenlit scans GitHub repos built with Lovable, Bolt, or Cursor and gives non-technical founders a plain-English security report, a live proof-of-exploit, and an auto-fix PR — without needing to understand the code.

> Paste your repo → understand it → secure it → deploy it.

---

## What's built

### Core scan pipeline
- Paste any GitHub URL → Greenlit clones the repo, runs a RAG-powered analysis via Gemini, and returns a health score (0–100) with plain-English vulnerability descriptions
- Commit-SHA caching — same commit is never scanned twice; results are copied instantly
- Diff scanning — push to GitHub, only changed files are re-analyzed (faster + cheaper)

### Security
- **14-point DAST probe** — live HTTP checks against your deployed URL: HTTPS enforcement, security headers, exposed `.env`/`.git`, CORS misconfig, SQL injection, XSS, IDOR, rate limiting, API key leaks in JS bundles
- Proof-of-exploit: shows the actual HTTP request and stolen data, not just "vulnerability found"
- Auto-Fix PR generation (Gemini writes the diff, GitHub API opens the PR)

### Platform
- GitHub OAuth login
- Track multiple repos with continuous monitoring (webhook-triggered on every push)
- Public shareable report pages with OG meta tags (Twitter/Slack cards)
- Scan-complete email alerts (Resend)
- Greenlit badge for README (`![Greenlit](https://api.greenlit.dev/api/public/badge/{repo_id})`)

### Payments
- 3-tier plans: Free / Starter ($7/mo) / Builder ($29/mo)
- India pricing via Razorpay (₹299 / ₹999), global via Stripe
- Geo-routing from `CF-IPCountry` header

### Security hardening (Sprint 6)
- Rate limiting (slowapi): 10/min scan, 20/min chat
- GitHub URL regex validation on all scan endpoints
- HTTP security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- CORS origins from env (`ALLOWED_ORIGINS`), localhost defaults for dev
- Repo name normalization (handles full URLs, `.git` suffix, trailing slashes)

---

## What's left

| Sprint | What |
|--------|------|
| 8 | Persist ChromaDB to disk (currently in-memory — restarts lose vectors) |
| 9 | Real auto-fix PR via GitHub API (diff is generated; PR creation is stubbed) |
| 10 | Scan queue visibility — show "2 active, 1 queued" in the UI |
| 11 | Mobile-responsive landing page (proof-of-exploit grid breaks on small screens) |
| 12 | `httpOnly` cookie auth (currently token in `localStorage` — known smell) |
| 13 | Production deploy on Oracle Cloud Free (ARM Ampere, always-free tier) |
| 14 | "State of Vibe Coding" viral post with real aggregate data |

---

## Stack

```
backend/    FastAPI · SQLite (WAL) · ChromaDB · HuggingFace Embeddings
            Google Gemini (gemini-2.5-flash) · Resend · Stripe · Razorpay
            ThreadPoolExecutor job queue · slowapi rate limiting

frontend/   Next.js 16 · React 19 · TypeScript
            CSS variables design system (dark theme, no Tailwind)
            Lucide icons
```

---

## Running locally

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in GEMINI_API_KEY + GitHub OAuth keys
python -m app.main          # starts on :8000 with hot reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev                         # starts on :3000
```

CORS is pre-configured for `localhost:3000` in dev. No extra setup needed.

### Minimum env to demo (backend `.env`)

```
GEMINI_API_KEY=...          # free at aistudio.google.com
GITHUB_CLIENT_ID=...        # GitHub OAuth App
GITHUB_CLIENT_SECRET=...
JWT_SECRET=any-random-string
```

Everything else (Stripe, Razorpay, Resend) falls back gracefully — the app demos fully without them.

---

## Plans

| Plan | Price | Repos | DAST | Auto-Fix |
|------|-------|-------|------|----------|
| Free | $0 | 1 | — | — |
| Starter | $7/mo · ₹299/mo | 3 | — | — |
| Builder | $29/mo · ₹999/mo | ∞ | ✓ | ✓ |

---

## ICP

Non-technical founders who ship with Lovable / Bolt / Cursor and have no idea if their app is secure. They don't know what "SQL injection" means but they absolutely understand "anyone can download your entire user database."
