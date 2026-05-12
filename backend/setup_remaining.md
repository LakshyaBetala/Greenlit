# Greenlit — Setup: API Keys & Environment Variables

Copy `.env.example` to `.env` and fill in the values below.

```
cd chaosmonkey-backend
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux
```

---

## Tier 1 — Required to run at all

| Variable | Where to get it | Notes |
|---|---|---|
| `GITHUB_CLIENT_ID` | github.com/settings/developers → New OAuth App | Callback URL: `http://localhost:8000/auth/github/callback` |
| `GITHUB_CLIENT_SECRET` | Same OAuth App page (after creation) | Keep secret |
| `JWT_SECRET` | Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"` | Any random 64-char string |
| `GEMINI_API_KEY` | aistudio.google.com/apikey | Free, no credit card. Powers all AI analysis |

Without these 4, the server boots but login and scanning are broken.

---

## Tier 2 — Auto-Fix PRs (Sprint 5 feature)

| Variable | Where to get it | Notes |
|---|---|---|
| `GITHUB_TOKEN` | github.com/settings/tokens → Personal access token (classic) | Scopes: `repo` (full). Used to push Auto-Fix PRs to repos you own. If empty, Auto-Fix runs in simulation mode |

---

## Tier 3 — Email alerts (Resend)

| Variable | Where to get it | Notes |
|---|---|---|
| `RESEND_API_KEY` | resend.com → API Keys | Free tier: 3,000 emails/month, no credit card |
| `RESEND_FROM_EMAIL` | Must be a domain you've verified in Resend | Default: `alerts@greenlit.dev`. For testing, use Resend's sandbox sender |

Without these, email alerts log a warning but never crash the server.

---

## Tier 4 — Payments (Stripe — Global)

| Variable | Where to get it | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys | Use `sk_test_...` for dev |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Add endpoint → Signing secret | Endpoint: `https://your-domain/api/payments/stripe/webhook` |
| `STRIPE_PRICE_STARTER_USD` | Stripe → Products → Create product ($7/mo recurring) → copy Price ID | Format: `price_xxx` |
| `STRIPE_PRICE_BUILDER_USD` | Stripe → Products → Create product ($29/mo recurring) → copy Price ID | Format: `price_xxx` |
| `STRIPE_PRICE_STARTER_INR` | Same as above but create price in INR currency (₹299/mo) | Optional — falls back to USD |
| `STRIPE_PRICE_BUILDER_INR` | Same — INR (₹999/mo) | Optional |

Without Stripe keys, the checkout endpoint returns a `"demo"` URL that bounces back to /pricing.

---

## Tier 5 — Payments (Razorpay — India)

| Variable | Where to get it | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys | Format: `rzp_test_xxx` for test mode |
| `RAZORPAY_KEY_SECRET` | Same page | Keep secret |
| `RAZORPAY_PLAN_STARTER` | Razorpay Dashboard → Subscriptions → Plans → Create plan (₹299/mo) | Format: `plan_xxx` |
| `RAZORPAY_PLAN_BUILDER` | Same — ₹999/mo | Format: `plan_xxx` |

Razorpay is used only for users detected as India (via `CF-IPCountry: IN` header).
Without keys, Indian users get the demo fallback URL.

---

## Tier 6 — Webhooks (continuous monitoring)

| Variable | Where to get it | Notes |
|---|---|---|
| `GITHUB_WEBHOOK_SECRET` | Any random string you choose | Must match the secret set in each GitHub repo webhook |

Set this to any random string, then use it when registering webhooks on GitHub repos via the dashboard or API.

---

## Production-only overrides

| Variable | Default | Notes |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:3000` | Set to `https://greenlit.dev` in production |
| `BACKEND_URL` | `http://localhost:8000` | Set to `https://api.greenlit.dev` in production |
| `ALLOWED_ORIGINS` | _(empty)_ | Comma-separated extra CORS origins. Dev origins always included |
| `DATABASE_PATH` | `.storage/greenlit.db` (next to repo root) | Override to `/data/greenlit.db` on Oracle Cloud |

---

## Frontend (`.env.local` in `chaosmonkey-frontend/`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` (dev) or `https://api.greenlit.dev` (prod) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (dev) or `https://greenlit.dev` (prod) |
| `NEXT_PUBLIC_POSTHOG_KEY` | posthog.com → Project → API key (optional, analytics only) |

---

## Quick check — what's working without any keys

| Feature | No keys? |
|---|---|
| Homepage, landing, pricing page | ✅ Always works |
| Paste URL → demo report | ✅ Returns hardcoded DEMO_REPORT |
| GitHub login | ❌ Needs `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` |
| Real AI scan | ❌ Needs `GEMINI_API_KEY` |
| Auto-Fix PR | ❌ Needs `GITHUB_TOKEN` (or user's token) + `GEMINI_API_KEY` |
| Email alerts | ⚠️ Logs to console, no email sent |
| Stripe checkout | ⚠️ Returns demo URL |
| Razorpay checkout | ⚠️ Returns demo URL |
