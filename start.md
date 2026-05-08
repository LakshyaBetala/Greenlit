# Greenlit — How to Run

**Single source of truth:** `https://github.com/LakshyaBetala/Greenlit`

All code lives under `backend/` and `frontend/` in this repo.

## Prerequisites

- Python 3.10+ (tested on 3.14)
- Node.js 18+ and npm
- Git (must be on PATH — used by repo clone operations during scans)

---

## Clone the repo

```bash
git clone https://github.com/LakshyaBetala/Greenlit.git
cd Greenlit
```

---

## Backend (`backend/`)

### First time setup

```bash
cd backend

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
# From backend/ with venv activated
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

## Frontend (`frontend/`)

### First time setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env.local
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local
```

### Run the frontend

```bash
npm run dev
```

App opens at **http://localhost:3000**

### Other frontend commands

```bash
npm run build     # production build — verifies zero TypeScript errors
npm run lint      # eslint check
```

---

## Running both together (local dev)

Open two terminals from the repo root:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate          # Windows
python -m app.main
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:3000**

---

## GitHub OAuth setup (login)

1. Go to **github.com/settings/developers** → New OAuth App
2. Set:
   - Application name: `Greenlit (dev)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8000/auth/github/callback`
3. Copy **Client ID** and **Client Secret** into `backend/.env`:
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

# Platform stats (no auth required)
curl http://localhost:8000/api/repos/stats

# Trigger a demo scan (returns DEMO_REPORT when no GEMINI_API_KEY is set)
curl -X POST http://localhost:8000/api/repos/analyze-url \
     -H "Content-Type: application/json" \
     -d '{"github_url": "https://github.com/octocat/Hello-World"}'
```

---

## Git workflow (single repo)

All changes go through this repo only — no other GitHub remotes exist.

```bash
# Make changes in backend/ or frontend/
git add backend/app/some_file.py
git commit -m "fix: describe what changed"
git push origin main
```

---

## Resetting the database

```bash
# Delete the SQLite file — recreated automatically on next server start
rm backend/.storage/greenlit.db     # Mac/Linux
del backend\.storage\greenlit.db    # Windows
```

---

## Common errors

| Error | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Run `python -m app.main` not `python app/main.py` |
| `GITHUB_CLIENT_ID not set` | Fill in `backend/.env` — see `setup_remaining.md` |
| Scan stuck in "processing" | Restart backend — startup hook auto-resets stuck scans |
| `git: command not found` | Install Git and add it to PATH — required for scanning |
| CORS error in browser | Ensure backend is on `:8000` and frontend on `:3000` |
