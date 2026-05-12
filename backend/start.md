# Greenlit — How to Run

## Prerequisites

- Python 3.10+ (tested on 3.14)
- Node.js 18+ and npm
- Git (must be on PATH — used by clone operations)

---

## Backend (`chaosmonkey-backend/`)

### First time setup

```bash
cd chaosmonkey-backend

# 1. Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and fill env vars  (see setup_remaining.md for each key)
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

### Run the backend

```bash
# From chaosmonkey-backend/ with venv activated
python -m app.main
```

Server starts at **http://localhost:8000**

Interactive API docs at **http://localhost:8000/docs**

The command uses `uvicorn` with:
- Auto-reload watching only `app/` (won't restart when repos are cloned)
- SQLite DB auto-created at `.storage/greenlit.db` on first boot

### Alternative (direct uvicorn)

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Frontend (`chaosmonkey-frontend/`)

### First time setup

```bash
cd chaosmonkey-frontend

# 1. Install dependencies
npm install

# 2. Create env file
copy .env.local.example .env.local    # Windows  (if example exists)
# OR manually create .env.local with:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Run the frontend

```bash
npm run dev
```

App opens at **http://localhost:3000**

### Other frontend commands

```bash
npm run build     # production build — run this to verify no TypeScript errors
npm run lint      # eslint check
```

---

## Running both together (local dev)

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd chaosmonkey-backend
venv\Scripts\activate          # Windows
python -m app.main
```

**Terminal 2 — Frontend:**
```bash
cd chaosmonkey-frontend
npm run dev
```

Then open **http://localhost:3000**

---

## GitHub OAuth setup (for login to work)

1. Go to **github.com/settings/developers** → New OAuth App
2. Set:
   - Application name: `Greenlit (dev)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8000/auth/github/callback`
3. Copy **Client ID** and **Client Secret** into `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_secret
   ```
4. Restart the backend

---

## Verifying everything works

```bash
# Health check
curl http://localhost:8000/health

# Platform stats (no auth)
curl http://localhost:8000/api/repos/stats

# Trigger a demo scan (no GEMINI_API_KEY → returns demo report)
curl -X POST http://localhost:8000/api/repos/analyze-url \
     -H "Content-Type: application/json" \
     -d '{"github_url": "https://github.com/octocat/Hello-World"}'
```

---

## Resetting the database

```bash
# Delete the SQLite file — it will be recreated on next server start
rm chaosmonkey-backend/.storage/greenlit.db     # Mac/Linux
del chaosmonkey-backend\.storage\greenlit.db    # Windows
```

---

## Common errors

| Error | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Run `python -m app.main` not `python app/main.py` |
| `GITHUB_CLIENT_ID not set` | Fill in `.env` — see `setup_remaining.md` |
| Scan stuck in "processing" | Restart backend — startup hook auto-resets stuck scans |
| `git: command not found` | Install Git and add to PATH — required for repo cloning |
| CORS error in browser | Make sure backend is running on `:8000` and frontend on `:3000` |
| `chromadb` import error on Windows | Run `pip install chromadb` — or use the demo mode (no Gemini key) |
