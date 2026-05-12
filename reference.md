# Greenlit — Complete Reference

Single source of truth for file structure, required keys, start commands, and what can be deleted.

---

## Folder structure (what matters)

```
agent_ops/
├── greenlit/                        ← THE ONLY REPO — github.com/LakshyaBetala/Greenlit
│   ├── backend/                     ← Python FastAPI server
│   │   ├── app/
│   │   │   ├── main.py              ← Entry point. Registers all routers, CORS, startup hooks
│   │   │   ├── config.py            ← ALL env vars loaded here. Never read os.getenv elsewhere
│   │   │   ├── database.py          ← All SQLite CRUD. Single source of DB truth
│   │   │   ├── queue.py             ← ThreadPoolExecutor job queue (max 3 workers)
│   │   │   ├── tasks.py             ← process_full_scan + process_diff_scan pipelines
│   │   │   ├── uptime_worker.py     ← Background loop: pings production_url every 5 min
│   │   │   ├── api/
│   │   │   │   ├── repos.py         ← Core: analyze-url, job poll, track/untrack, history
│   │   │   │   ├── payments.py      ← Stripe + Razorpay checkout, webhooks, plan lookup
│   │   │   │   ├── probe.py         ← DAST probe start/poll
│   │   │   │   ├── public.py        ← Public report sharing, platform stats
│   │   │   │   ├── webhooks.py      ← GitHub push webhook → diff scan
│   │   │   │   ├── blueprints.py    ← AI next-feature suggestions
│   │   │   │   ├── idea_to_app.py   ← Idea → vibe-coding prompt
│   │   │   │   └── stripe.py        ← LEGACY stub — do not add to this
│   │   │   ├── auth/
│   │   │   │   └── github.py        ← GitHub OAuth /login + /callback
│   │   │   └── services/
│   │   │       ├── rag_service.py   ← Full RAG pipeline (lazy ML imports)
│   │   │       ├── dast_service.py  ← 14 async httpx security checks
│   │   │       ├── autofix_service.py ← Gemini-generated fix PRs
│   │   │       ├── chat_service.py  ← AI Sidekick Q&A
│   │   │       ├── email_service.py ← Resend email alerts
│   │   │       ├── github_service.py← GitHub API calls (list user repos)
│   │   │       ├── ai_report_service.py ← Alternative report generation path
│   │   │       └── repo_clone.py    ← git clone helper
│   │   ├── schema.sql               ← DB schema (users, repos, scans, probes tables)
│   │   ├── requirements.txt         ← All Python dependencies
│   │   ├── .env.example             ← Template — copy to .env and fill in
│   │   ├── Procfile                 ← For Render/Heroku deploy
│   │   └── render.yaml              ← For Render one-click deploy
│   ├── frontend/                    ← Next.js 16 + React 19
│   │   ├── app/
│   │   │   ├── page.tsx             ← Landing page (hero, features, pricing preview)
│   │   │   ├── layout.tsx           ← Root layout + metadata
│   │   │   ├── globals.css          ← Design system (CSS vars, dark theme, grid classes)
│   │   │   ├── explore/page.tsx     ← Paste URL → scan → Bento Grid results (main feature)
│   │   │   ├── dashboard/page.tsx   ← Auth-required: tracked repos, stats
│   │   │   ├── pricing/page.tsx     ← Pricing + Stripe/Razorpay checkout
│   │   │   ├── guide/page.tsx       ← Non-tech education (what is GitHub, how to deploy)
│   │   │   ├── idea/page.tsx        ← Idea → vibe-coding prompt generator
│   │   │   ├── analyze/page.tsx     ← Legacy results view (deep-link scan IDs)
│   │   │   ├── auth/callback/page.tsx ← GitHub OAuth redirect handler
│   │   │   └── report/[scanId]/     ← Public shareable report page
│   │   ├── components/              ← All UI components (16 total)
│   │   ├── services/api.ts          ← Single API client. All fetch calls go here
│   │   ├── types/index.ts           ← TypeScript types
│   │   ├── package.json
│   │   ├── next.config.ts           ← Security headers + CSP
│   │   ├── tsconfig.json
│   │   └── vercel.json              ← Vercel deploy config
│   ├── reference.md                 ← THIS FILE
│   ├── oracle_deploy.md             ← Step-by-step Oracle Cloud deploy guide
│   ├── deploy.md                    ← Railway vs Render comparison
│   ├── deploy_checklist.md          ← Quick Render + Vercel checklist
│   ├── community_posts.md           ← Ready-to-post X/Reddit/LinkedIn templates
│   ├── setup_remaining.md           ← API key setup guide (in backend/ too)
│   └── start.md                     ← How to run locally (in backend/ too)
│
├── chaosmonkey-backend/             ← LOCAL DEV ONLY. Has venv + .env. No remote.
├── chaosmonkey-frontend/            ← LOCAL DEV ONLY. Has node_modules + .env.local. No remote.
└── CLAUDE.md                        ← Instructions for Claude Code
```

---

## Files that can be deleted

### In `greenlit/backend/`
| File | Why safe to delete |
|------|-------------------|
| `render.yaml` | Only needed if deploying to Render. Keep if you might use Render. |
| `Procfile` | Only needed for Render/Heroku. Keep alongside render.yaml. |
| `setup_remaining.md` | Duplicate of the root `setup_remaining.md` — keep one, delete one |
| `start.md` | Duplicate of the root `start.md` — keep one, delete one |

### In `greenlit/frontend/`
| File | Why safe to delete |
|------|-------------------|
| `next-env.d.ts` | Auto-generated by Next.js — will be recreated on `npm run build` |
| `vercel.json` | Only needed for Vercel. Keep if deploying to Vercel. |
| `public/vercel.svg` | Default Next.js asset, not used in the app |
| `public/file.svg` | Default Next.js asset, not used in the app |
| `public/window.svg` | Default Next.js asset, not used in the app |

### In `chaosmonkey-backend/` and `chaosmonkey-frontend/`
**Both folders can be fully deleted once you are working directly in `greenlit/`.**
They exist only because they have `venv/` and `.env` (backend) and `node_modules/` + `.env.local` (frontend) which are gitignored and can't be in the greenlit repo. Once you recreate those in `greenlit/backend/` and `greenlit/frontend/`, the chaosmonkey folders are dead weight.

---

## Start commands

### Backend

```bash
cd greenlit/backend

# First time only
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # then fill in your keys

# Every time after
venv\Scripts\activate
python -m app.main
```

**Server starts at:** `http://localhost:8000`
**API docs at:** `http://localhost:8000/docs`

### Frontend

```bash
cd greenlit/frontend

# First time only
npm install
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# Every time after
npm run dev
```

**App opens at:** `http://localhost:3000`

### Both together (two terminals)

```
Terminal 1:   cd greenlit/backend  → venv\Scripts\activate → python -m app.main
Terminal 2:   cd greenlit/frontend → npm run dev
Then open:    http://localhost:3000
```

---

## Required keys — what breaks without each one

### Keys the server needs on startup

| Key | Default if missing | Impact |
|-----|--------------------|--------|
| `GITHUB_CLIENT_ID` | None | Login button broken. Everything else works. |
| `GITHUB_CLIENT_SECRET` | None | Login button broken. |
| `JWT_SECRET` | None | Sessions broken — users can't stay logged in |
| `GEMINI_API_KEY` | None | Real AI scans disabled → returns DEMO_REPORT instead. App still runs. |

**Generate JWT_SECRET:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Keys that enable optional features

| Key | Feature it unlocks | Works without it? |
|-----|--------------------|-------------------|
| `GITHUB_TOKEN` | Auto-Fix PRs (pushes real code) | Yes — runs in simulation mode |
| `RESEND_API_KEY` | Email alerts for critical vulns | Yes — logs to console only |
| `RESEND_FROM_EMAIL` | Sender address for emails | Yes — needed alongside RESEND_API_KEY |
| `GITHUB_WEBHOOK_SECRET` | Continuous monitoring via push webhooks | Yes — just no webhook security |
| `STRIPE_SECRET_KEY` | Stripe checkout (global payments) | Yes — returns demo URL |
| `STRIPE_WEBHOOK_SECRET` | Stripe plan upgrades via webhook | Yes — plans won't auto-update |
| `STRIPE_PRICE_STARTER_USD` | Starter plan Stripe checkout | Yes — returns demo URL |
| `STRIPE_PRICE_BUILDER_USD` | Builder plan Stripe checkout | Yes — returns demo URL |
| `STRIPE_PRICE_STARTER_INR` | Starter in INR (India, Stripe) | Yes — falls back to USD |
| `STRIPE_PRICE_BUILDER_INR` | Builder in INR (India, Stripe) | Yes — falls back to USD |
| `RAZORPAY_KEY_ID` | Razorpay checkout (India) | Yes — returns demo URL |
| `RAZORPAY_KEY_SECRET` | Razorpay subscription verification | Yes — returns demo URL |
| `RAZORPAY_PLAN_STARTER` | Razorpay starter plan | Yes — returns demo URL |
| `RAZORPAY_PLAN_BUILDER` | Razorpay builder plan | Yes — returns demo URL |

### URL env vars (defaults work for local dev)

| Key | Default | Change for production |
|-----|---------|----------------------|
| `FRONTEND_URL` | `http://localhost:3000` | Your Vercel URL |
| `BACKEND_URL` | `http://localhost:8000` | Your Oracle/Render URL |
| `ALLOWED_ORIGINS` | _(empty)_ | Your Vercel URL (if different) |
| `DATABASE_PATH` | `.storage/greenlit.db` | `/data/greenlit.db` on Oracle |

### Frontend env vars (in `.env.local`)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` (dev) / your backend URL (prod) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (dev) / your Vercel URL (prod) |

---

## Minimum .env to run locally with real scans

```bash
# backend/.env — paste this, fill in 4 values, everything else is optional

GITHUB_CLIENT_ID=        # from github.com/settings/developers
GITHUB_CLIENT_SECRET=    # same page
JWT_SECRET=              # python -c "import secrets; print(secrets.token_urlsafe(64))"
GEMINI_API_KEY=          # from aistudio.google.com/apikey (free)

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

```bash
# frontend/.env.local — just this one line
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

**Without GEMINI_API_KEY:** The app still runs. Pasting any GitHub URL returns DEMO_REPORT instantly. All pages load. Login works if GitHub OAuth keys are set.

**Without GitHub OAuth keys:** App runs, scans work, but login button is broken (500 error on click).

**Minimum to show to anyone:** Just `GEMINI_API_KEY` + `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` + `JWT_SECRET`.

---

## What each page does (at a glance)

| URL | File | Auth required? | Works without GEMINI? |
|-----|------|---------------|----------------------|
| `/` | `app/page.tsx` | No | Yes — static landing |
| `/explore` | `app/explore/page.tsx` | No | Yes — returns DEMO_REPORT |
| `/dashboard` | `app/dashboard/page.tsx` | Yes | Yes |
| `/pricing` | `app/pricing/page.tsx` | No | Yes |
| `/guide` | `app/guide/page.tsx` | No | Yes |
| `/idea` | `app/idea/page.tsx` | No | Yes (Gemini optional) |
| `/report/[scanId]` | `app/report/[scanId]/` | No | Yes |
| `/analyze` | `app/analyze/page.tsx` | No | Yes (legacy) |

---

## Quick health check after starting

```bash
# Backend alive?
curl http://localhost:8000/health
# → {"status":"healthy","active_scans":0}

# Demo scan works?
curl -X POST http://localhost:8000/api/repos/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/octocat/Hello-World"}'
# → {"status":"processing","scan_id":"..."}

# Then poll it:
curl http://localhost:8000/api/repos/jobs/SCAN_ID_HERE
# → {"status":"complete","result":{...}}
```
