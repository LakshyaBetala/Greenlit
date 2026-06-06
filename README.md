# 🟢 Greenlit

**CTO in a box for AI-built apps.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-63.7%25-blue)](frontend/)
[![Python](https://img.shields.io/badge/Python-33.9%25-green)](backend/)
[![Status](https://img.shields.io/badge/status-active-brightgreen)]()

> Paste your repo → understand it → secure it → deploy it.

Greenlit is a **security intelligence platform** for AI-built applications. It scans GitHub repositories built with [Lovable](https://lovable.ai), [Bolt](https://bolt.new), or [Cursor](https://www.cursor.com) and delivers non-technical founders actionable security insights: plain-English vulnerability descriptions, live proof-of-exploit demonstrations, and AI-generated auto-fix pull requests.

---

## 🎯 The Problem

Founders using AI code generation tools (Lovable, Bolt, Cursor) ship fast. They don't have a CTO, security engineer, or DevOps team. They have no way to know if their app is secure. They understand business risk ("anyone can download my entire database"), not technical jargon ("SQL injection via an un-parameterized query").

Greenlit bridges that gap.

---

## 🚀 Core Features

### 1. **RAG-Powered Code Analysis**
- Paste any GitHub URL → Greenlit clones the repo and runs a deep analysis via Gemini
- Returns a **health score (0–100)** with plain-English security insights
- **Commit-SHA caching** — same commit is never scanned twice; results copied instantly
- **Diff scanning** — push to GitHub, only changed files re-analyzed (faster & cheaper)

### 2. **14-Point DAST Security Probe**
Live HTTP checks against your deployed URL:
- ✓ HTTPS enforcement & TLS version
- ✓ Security headers (CSP, X-Frame-Options, HSTS)
- ✓ Exposed `.env`, `.git`, or sensitive files
- ✓ CORS misconfiguration
- ✓ SQL injection & XSS vectors
- ✓ Insecure Direct Object Reference (IDOR)
- ✓ Rate limiting bypass
- ✓ API key exposure
- ✓ Authentication bypass patterns
- **Proof-of-exploit:** shows the actual HTTP request and stolen data—not just "vulnerability found"

### 3. **Auto-Fix Pull Requests**
- Gemini generates the security fix diff
- GitHub API automatically opens a PR
- One click to merge protection into production

### 4. **Continuous Monitoring**
- GitHub OAuth login + multi-repo dashboard
- Webhook-triggered scans on every push
- Email alerts on scan completion (Resend)
- Public shareable report pages with OG meta tags (Twitter/Slack cards)
- Greenlit badge for README:
  ```markdown
  ![Greenlit](https://api.greenlit.dev/api/public/badge/{repo_id})
  ```

### 5. **Flexible Pricing & Global Support**
| Plan | Price | Repos | DAST | Auto-Fix | Features |
|------|-------|-------|------|----------|----------|
| **Free** | $0 | 1 | — | — | Basic code analysis, 1 repo |
| **Starter** | $7/mo<br>₹299/mo | 3 | — | — | Multiple repos, email alerts |
| **Builder** | $29/mo<br>₹999/mo | ∞ | ✓ | ✓ | Full DAST, auto-fix PRs, priority support |

- **India pricing via Razorpay**, global via Stripe
- Geo-routing from `CF-IPCountry` header

### 6. **Security Hardening**
- Rate limiting (slowapi): 10/min for scans, 20/min for chat
- GitHub URL regex validation on all scan endpoints
- HTTP security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- CORS origins from env (`ALLOWED_ORIGINS`), localhost defaults for dev
- Repo name normalization (handles full URLs, `.git` suffix, trailing slashes)

---

## 📋 Target ICP

**Non-technical founders** who:
- Ship with Lovable, Bolt, or Cursor
- Have no DevOps/security team
- Understand business impact ("anyone can download my data") but not technical jargon
- Want confidence their app is production-ready
- Need compliance-ready proof-of-security for investors

---

## 🏗️ Architecture & Tech Stack

### Backend
```
FastAPI (Python)           │ High-performance async HTTP framework
SQLite (WAL mode)          │ Lightweight persistence with write-ahead logging
ChromaDB                   │ Vector database for RAG-powered analysis
HuggingFace Embeddings     │ Semantic search & code understanding
Google Gemini 2.5 Flash    │ State-of-the-art LLM for security analysis
ThreadPoolExecutor         │ Async job queue for long-running scans
slowapi                    │ Rate limiting & request throttling
Stripe & Razorpay          │ Global payment processing
Resend                     │ Transactional emails
```

### Frontend
```
Next.js 16 (TypeScript)    │ Modern React framework with SSR
React 19                   │ Latest component & hooks patterns
TypeScript                 │ Type-safe frontend development
CSS Variables              │ Custom design system (dark theme, no Tailwind)
Lucide Icons               │ Beautiful, lightweight icon library
```

### Language Composition
- **TypeScript**: 63.7% (Frontend + shared types)
- **Python**: 33.9% (Backend + analysis engine)
- **CSS**: 2.3% (Design system & styling)
- **Other**: 0.1%

---

## 📂 Project Structure

```
greenlit/
├── backend/                    # FastAPI security analysis engine
│   ├── app/
│   │   ├── main.py            # FastAPI app setup
│   │   ├── models/            # Database schemas
│   │   ├── routes/            # API endpoints (scan, auth, reports)
│   │   ├── services/          # Business logic (security checks, LLM calls)
│   │   ├── security/          # Auth, rate limiting, validation
│   │   └── utils/             # Helpers (GitHub API, embeddings)
│   ├── requirements.txt        # Python dependencies
│   └── .env.example           # Environment template
│
├── frontend/                   # Next.js dashboard & UI
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # User dashboard
│   │   ├── reports/           # Security report pages
│   │   └── api/               # Backend proxy endpoints
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions & hooks
│   ├── styles/                # CSS variables & design system
│   └── .env.local.example     # Environment template
│
├── specs/                      # Technical specifications
├── prompt_master.md           # LLM prompt engineering
├── oracle_deploy.md           # Production deployment guide
└── pitch.md                   # Product & business pitch
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.9+ (backend)
- Git
- GitHub OAuth App credentials
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Quick Start (Development)

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Fill in your `.env`:
```
GEMINI_API_KEY=<your-gemini-key>
GITHUB_CLIENT_ID=<github-oauth-id>
GITHUB_CLIENT_SECRET=<github-oauth-secret>
JWT_SECRET=your-random-secret-key
```

Optional (gracefully degraded if missing):
```
STRIPE_SECRET_KEY=...
RAZORPAY_KEY_ID=...
RESEND_API_KEY=...
```

Start the backend:
```bash
python -m app.main  # Runs on http://localhost:8000 with hot reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Set your `.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:
```bash
npm run dev  # Runs on http://localhost:3000
```

**CORS is pre-configured for localhost:3000 in dev. No extra setup needed.**

#### 3. Verify It Works
- Open http://localhost:3000
- Login with GitHub
- Paste a GitHub repo URL and scan

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/github` — GitHub OAuth login
- `POST /auth/logout` — Logout

### Scanning
- `POST /api/scan` — Start a new scan (body: `{ "repo_url": "..." }`)
- `GET /api/scan/{scan_id}` — Poll scan results
- `GET /api/scan/{scan_id}/report` — Get formatted security report
- `POST /api/scan/{scan_id}/auto-fix` — Generate auto-fix PR

### Reports
- `GET /api/reports/{repo_id}` — Fetch report for repo
- `GET /api/public/report/{report_id}` — Shareable public report

### DAST
- `POST /api/dast/probe` — Run live security probe (Builder plan only)

---

## 📊 Data & Privacy

- **Scan data** persisted in SQLite with automatic cleanup after 30 days
- **Code vectors** stored in ChromaDB (in-memory, lost on restart—Sprint 8 will persist to disk)
- **GitHub OAuth** tokens stored encrypted; never shared or logged
- **DAST probes** performed directly against your deployment; no data mirrored
- **Public reports** only accessible with a secure token; queryable only by owner

---

## 🎯 Development Roadmap

| Sprint | Milestone | Status |
|--------|-----------|--------|
| ✅ 1-7 | MVP: Scan, Auth, Reports, DAST, Payments | Complete |
| 8 | Persist ChromaDB to disk (currently in-memory) | Upcoming |
| 9 | Real auto-fix PR via GitHub API | Upcoming |
| 10 | Scan queue visibility UI | Upcoming |
| 11 | Mobile-responsive landing page | Upcoming |
| 12 | `httpOnly` cookie auth (security hardening) | Upcoming |
| 13 | Production deploy on Oracle Cloud (ARM Ampere) | Upcoming |
| 14 | Viral post: "State of Vibe Coding" with real data | Upcoming |

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- **Backend**: Follow PEP 8; use type hints; add tests for new endpoints
- **Frontend**: Use TypeScript; components should be re-usable; add proper error boundaries
- **Security**: Run OWASP checks; validate all user input; sanitize before rendering

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 💬 Support & Community

- **Issues & Bugs**: [GitHub Issues](https://github.com/LakshyaBetala/Greenlit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/LakshyaBetala/Greenlit/discussions)
- **Email**: contact@greenlit.dev

---

## 🙏 Acknowledgments

- Built for founders shipping with AI code generation tools
- Powered by Google Gemini & HuggingFace
- Security insights from OWASP & industry best practices
- Community feedback shapes every sprint

---

**Built with ❤️ by [Lakshya Betala](https://github.com/LakshyaBetala)**

<div align="center">

**[🚀 Try Greenlit](https://greenlit.dev)** • **[📖 Docs](docs/)** • **[🐛 Report Issue](https://github.com/LakshyaBetala/Greenlit/issues)**

</div>
