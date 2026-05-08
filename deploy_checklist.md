# Greenlit — Production Deployment Checklist

## Step 1: Deploy Backend to Render.com (Free)

1. Go to **render.com** → New → Web Service
2. Connect GitHub → select `LakshyaBetala/Greenlit`
3. Set:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free (or Starter for no sleep)
4. Add a **Disk** (required for SQLite):
   - Name: `greenlit-data`
   - Mount path: `/data`
   - Size: 1 GB
5. Add env vars (minimum to demo without paying):

   | Key | Value |
   |-----|-------|
   | `DATABASE_PATH` | `/data/greenlit.db` |
   | `GITHUB_CLIENT_ID` | your GitHub OAuth app client ID |
   | `GITHUB_CLIENT_SECRET` | your GitHub OAuth app secret |
   | `JWT_SECRET` | any random 64-char string |
   | `GEMINI_API_KEY` | from aistudio.google.com/apikey |
   | `FRONTEND_URL` | https://greenlit.vercel.app (set after step 2) |
   | `BACKEND_URL` | https://greenlit-backend.onrender.com |

6. Deploy → note your Render URL (e.g., `https://greenlit-backend.onrender.com`)

---

## Step 2: Deploy Frontend to Vercel (Free)

1. Go to **vercel.com** → New Project → Import from GitHub
2. Select `LakshyaBetala/Greenlit`
3. Set **Root directory** to `frontend`
4. Add env vars:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | https://greenlit-backend.onrender.com |
   | `NEXT_PUBLIC_SITE_URL` | https://your-app.vercel.app |

5. Deploy → note your Vercel URL
6. Go back to Render → update `FRONTEND_URL` to your Vercel URL
7. Go to your GitHub OAuth App settings → update **Homepage URL** and **Callback URL**:
   - Homepage: `https://your-app.vercel.app`
   - Callback: `https://greenlit-backend.onrender.com/auth/github/callback`

---

## Step 3: Verify the live demo works

```bash
# Backend health check
curl https://greenlit-backend.onrender.com/health

# Demo scan (no API key needed — returns DEMO_REPORT)
curl -X POST https://greenlit-backend.onrender.com/api/repos/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/octocat/Hello-World"}'
```

---

## Step 4: Custom domain (optional)

- Vercel: Settings → Domains → Add `greenlit.dev`
- Render: Settings → Custom Domains → Add `api.greenlit.dev`
- Update `FRONTEND_URL` and `BACKEND_URL` env vars to the custom domains
- Update GitHub OAuth callback to `https://api.greenlit.dev/auth/github/callback`

---

## What works without any paid API keys

| Feature | Free demo? |
|---------|-----------|
| Homepage, pricing page | ✅ Always |
| Paste URL → demo report | ✅ Yes (hardcoded DEMO_REPORT) |
| Real AI scan | ✅ Needs GEMINI_API_KEY (free at aistudio) |
| GitHub login | ✅ Needs GITHUB_CLIENT_ID/SECRET (free OAuth app) |
| Auto-Fix PRs | ⚠️ Simulation mode without GITHUB_TOKEN |
| Email alerts | ⚠️ Logs only without RESEND_API_KEY |
| Stripe/Razorpay | ⚠️ Demo URL without payment keys |

The demo is fully functional with just GEMINI_API_KEY + GitHub OAuth. Everything else is optional.

---

## Free tier limits to watch

| Service | Free limit |
|---------|-----------|
| Render | 750 hrs/month, sleeps after 15min inactivity |
| Vercel | 100GB bandwidth, unlimited deploys |
| Gemini API | 15 req/min, 1M tokens/day |
| SQLite disk | 1 GB on Render (upgrade to Render Starter for persistence guarantees) |

**Note:** Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds. Upgrade to Render Starter ($7/mo) to avoid cold starts for real users.
