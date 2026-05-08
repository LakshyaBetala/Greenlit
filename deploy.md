# Greenlit — Deployment Guide

## Railway vs Render — The Real Comparison

### Why this matters for Greenlit specifically

The backend runs a real ML stack: `torch` + `sentence-transformers` + `ChromaDB`. These are lazy-loaded (only activate when a scan runs), but when they do, they spike to ~1.5–2 GB RAM. This rules out the cheapest tiers on both platforms.

---

## Side-by-side: What actually matters

| | Railway Hobby | Railway Pro | Render Starter | Render Standard |
|---|---|---|---|---|
| **Monthly cost** | $5 base + usage | $20 base + usage | $7 flat | $25 flat |
| **RAM** | ~512 MB default | Up to 8 GB | 512 MB hard limit | 2 GB |
| **Build timeout** | **10 min** ❌ | 40 min ✅ | 120 min ✅ | 120 min ✅ |
| **Sleep on idle** | No | No | No | No |
| **Persistent disk** | $1.56/10 GB/mo | $1.56/10 GB/mo | $0.25/GB/mo | $0.25/GB/mo |
| **Real ML scans** | OOM risk | ✅ Works | OOM risk | ✅ Works |
| **Build with torch** | Likely timeout | ✅ Works | ✅ Works | ✅ Works |

---

## The verdict

**Demo-only (no real AI scans, just DEMO_REPORT):**
→ **Render Starter at $7/month** — No sleep, cheap, handles the server fine

**Real product with actual AI scans:**
→ **Railway Pro at $20/month** — Better DX, usage-based billing, 40-min builds, flexible RAM

**Best value for production with real scans:**
→ **Render Standard at $25/month** — Flat pricing, 2 GB RAM guaranteed, 120-min builds, simpler to manage

### Recommendation for right now

You're posting on X and Reddit. People will paste real repos and expect real results.

**Use Render Standard ($25/mo)** — it's $5 more than Railway Pro but:
- Flat pricing (no surprise bills)
- 120-minute build timeout means torch installs reliably
- 2 GB RAM handles the ML pipeline
- Vercel handles the frontend for free
- **Total: $25/month for the whole stack**

If you want to keep costs lower: use the demo mode first (no GEMINI key = DEMO_REPORT always returns). Render Starter ($7/mo) handles demo mode fine. Add GEMINI key only after upgrading to Standard.

---

## Full cost breakdown — every API key

### Always free

| Service | Cost | Limit | Where |
|---------|------|-------|-------|
| **Gemini API** | $0 | 15 req/min, 1M tokens/day | aistudio.google.com/apikey |
| **GitHub OAuth App** | $0 | Unlimited | github.com/settings/developers |
| **GitHub PAT** (GITHUB_TOKEN) | $0 | Unlimited | github.com/settings/tokens |
| **JWT_SECRET** | $0 | — | Generate yourself (see below) |
| **GITHUB_WEBHOOK_SECRET** | $0 | — | Generate yourself (any string) |
| **Vercel** (frontend) | $0 | 100 GB bandwidth/mo | vercel.com |

### Free with limits (won't hit them for a while)

| Service | Free tier | Paid | Notes |
|---------|-----------|------|-------|
| **Resend** (email) | 3,000 emails/month | $20/mo for 50k | resend.com — enough until real users |
| **PostHog** (analytics) | 1M events/month | $0.0003/event | Optional, skip for now |

### Pay-per-transaction (no monthly fee until you charge users)

| Service | Fee | Notes |
|---------|-----|-------|
| **Stripe** | 2.9% + $0.30 per transaction | No monthly fee. Use test keys for free. |
| **Razorpay** (India) | 2% per transaction | No monthly fee. Test mode is free. |

**Bottom line on payments:** You pay nothing until you actually collect money. Add the test keys now so the UI doesn't show errors. Switch to live keys when ready.

### Hosting (the only real cost)

| Tier | Monthly | Right for |
|------|---------|-----------|
| Render Starter | $7 | Demo mode only (DEMO_REPORT, no real ML) |
| **Render Standard** | **$25** | **Real scans — recommended** |
| Railway Pro | $20 | Real scans, pay-as-you-go, better DX |
| Render disk (1 GB) | $0.25 | Included in Starter+; add separately on Railway |

**Total monthly spend for full production Greenlit:**
- Render Standard: $25
- Vercel frontend: $0
- All API keys: $0 (until you have paying users)
- **= $25/month**

---

## Step-by-step deployment

### Prerequisites

Before you start, generate the two secrets you need:

```bash
# JWT_SECRET (run this anywhere Python is available)
python -c "import secrets; print(secrets.token_urlsafe(64))"

# GITHUB_WEBHOOK_SECRET (any random string, e.g.)
python -c "import secrets; print(secrets.token_hex(32))"
```

Save both. You'll paste them into Render's env vars.

---

### Step 1 — GitHub OAuth App

1. Go to **github.com/settings/developers** → New OAuth App
2. Fill in:
   - Application name: `Greenlit`
   - Homepage URL: `https://your-app.vercel.app` *(update after Step 3)*
   - Authorization callback URL: `https://your-backend.onrender.com/auth/github/callback` *(update after Step 2)*
3. Click Register → copy **Client ID** and **Client Secret**

---

### Step 2 — Backend on Render Standard

1. Go to **render.com** → New → Web Service
2. Connect GitHub → select `LakshyaBetala/Greenlit`
3. Configure:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Standard ($25/mo)
4. Add a **Disk**:
   - Name: `greenlit-data`
   - Mount path: `/data`
   - Size: 1 GB ($0.25/mo — included in Standard pricing)
5. Add environment variables:

   **Required (server won't work without these):**
   | Key | Value |
   |-----|-------|
   | `DATABASE_PATH` | `/data/greenlit.db` |
   | `GITHUB_CLIENT_ID` | from Step 1 |
   | `GITHUB_CLIENT_SECRET` | from Step 1 |
   | `JWT_SECRET` | your generated 64-char string |
   | `GEMINI_API_KEY` | from aistudio.google.com/apikey |
   | `BACKEND_URL` | `https://your-backend.onrender.com` (your Render URL) |
   | `FRONTEND_URL` | `https://your-app.vercel.app` *(update after Step 3)* |

   **Optional (add when ready):**
   | Key | Value |
   |-----|-------|
   | `GITHUB_TOKEN` | your PAT with `repo` scope — enables real Auto-Fix PRs |
   | `RESEND_API_KEY` | from resend.com |
   | `RESEND_FROM_EMAIL` | verified domain email |
   | `GITHUB_WEBHOOK_SECRET` | your generated string |
   | `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe dashboard |
   | `STRIPE_WEBHOOK_SECRET` | from Stripe → Webhooks |
   | `STRIPE_PRICE_STARTER_USD` | `price_...` (create $7/mo product in Stripe) |
   | `STRIPE_PRICE_BUILDER_USD` | `price_...` (create $29/mo product in Stripe) |
   | `STRIPE_PRICE_STARTER_INR` | `price_...` (₹299/mo — optional) |
   | `STRIPE_PRICE_BUILDER_INR` | `price_...` (₹999/mo — optional) |
   | `RAZORPAY_KEY_ID` | `rzp_test_...` from Razorpay dashboard |
   | `RAZORPAY_KEY_SECRET` | from Razorpay dashboard |
   | `RAZORPAY_PLAN_STARTER` | `plan_...` (create ₹299/mo plan) |
   | `RAZORPAY_PLAN_BUILDER` | `plan_...` (create ₹999/mo plan) |

6. Deploy → wait for build (~15–20 min with torch)
7. Note your Render URL: `https://greenlit-backend.onrender.com`

---

### Step 3 — Frontend on Vercel

1. Go to **vercel.com** → Add New Project → Import `LakshyaBetala/Greenlit`
2. Configure:
   - **Root directory:** `frontend`
   - **Framework:** Next.js (auto-detected)
3. Add environment variables:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

4. Deploy → note your Vercel URL

---

### Step 4 — Wire everything together

Go back and update:

1. **Render** → your service → Environment → update `FRONTEND_URL` to your Vercel URL
2. **GitHub OAuth App** → update Homepage URL and Callback URL with real URLs
3. **Render** → restart the service (so it picks up the updated `FRONTEND_URL`)

---

### Step 5 — Verify it works

```bash
# 1. Health check — should return {"status": "healthy", "active_scans": 0}
curl https://your-backend.onrender.com/health

# 2. Demo scan — always works, returns report immediately
curl -X POST https://your-backend.onrender.com/api/repos/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/octocat/Hello-World"}'

# 3. Open the frontend and try pasting a GitHub URL
# Should complete a real scan in ~60 seconds (needs GEMINI_API_KEY)
```

---

## If you want to use Railway instead (Pro tier)

Railway has better UX and is slightly cheaper at $20/month base.

1. Go to **railway.app** → New Project → Deploy from GitHub repo
2. Select `LakshyaBetala/Greenlit` → select `backend` as the directory
3. Add a **Volume** (persistent disk):
   - Mount path: `/data`
   - Size: 5 GB (included in Pro)
4. Add environment variables (same list as Render above)
5. Set `DATABASE_PATH` = `/data/greenlit.db`
6. Deploy — the 40-minute build timeout handles torch reliably

Railway note: billing is usage-based. At $20/mo base you get $20 in compute credits. 512MB RAM running 24/7 = ~$3/month in RAM. CPU costs extra per request. Keep an eye on the usage dashboard to avoid surprise bills.

---

## Custom domain (optional, after launch)

### Render backend
1. Render → your service → Settings → Custom Domains
2. Add `api.greenlit.dev`
3. Point your DNS: CNAME `api` → `your-backend.onrender.com`
4. Update `BACKEND_URL` env var to `https://api.greenlit.dev`
5. Update `FRONTEND_URL` to `https://greenlit.dev`
6. Update GitHub OAuth callback to `https://api.greenlit.dev/auth/github/callback`

### Vercel frontend
1. Vercel → your project → Settings → Domains
2. Add `greenlit.dev`
3. Follow Vercel's DNS instructions (usually CNAME to `cname.vercel-dns.com`)
4. Update `NEXT_PUBLIC_SITE_URL` to `https://greenlit.dev`

---

## What works in demo mode (no real ML scans)

If you deploy without `GEMINI_API_KEY`:

| Feature | Works? |
|---------|--------|
| Homepage, pricing, landing | ✅ Always |
| Paste URL → get demo report | ✅ Returns DEMO_REPORT instantly |
| GitHub login | ✅ Needs OAuth keys only |
| Real AI analysis | ❌ Needs GEMINI_API_KEY |
| DAST live probe | ✅ Works (14 httpx checks, no ML) |
| Auto-Fix PRs | ⚠️ Simulation mode (needs GITHUB_TOKEN + GEMINI) |
| Email alerts | ⚠️ Logs to console only |
| Stripe/Razorpay checkout | ⚠️ Returns demo URL |

**Get GEMINI_API_KEY first** — it's free at aistudio.google.com/apikey and unlocks all the real AI features. Everything else is optional.

---

## Troubleshooting common deploy failures

| Error | Fix |
|-------|-----|
| Build times out (Railway Hobby) | Upgrade to Railway Pro (40-min timeout) |
| `ModuleNotFoundError: No module named 'app'` | Start command must be `uvicorn app.main:app ...`, not `python app/main.py` |
| `GITHUB_CLIENT_ID not set` | Check env vars in Render/Railway dashboard |
| GitHub OAuth callback mismatch | Update GitHub OAuth App's callback URL to match your Render URL exactly |
| CORS error in browser | Set `FRONTEND_URL` env var to your Vercel URL, restart backend |
| Scan stuck in "processing" | Restart the backend — startup hook auto-resets stuck scans |
| OOM (out of memory) during scan | Upgrade from Starter to Standard on Render (needs 2 GB for ML models) |
| `chromadb` import error | Already in requirements.txt — usually a build cache issue, try clear cache + redeploy |
