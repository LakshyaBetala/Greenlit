-- Greenlit — Database Schema
-- ═══════════════════════════════════════════════
-- SQLite (local dev + production on Oracle free tier)
-- WAL mode + foreign keys enabled in database.py on every connection

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id INTEGER UNIQUE NOT NULL,
    login TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    email TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'builder')),
    stripe_customer_id TEXT,
    razorpay_sub_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    github_url TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_monitoring INTEGER DEFAULT 0,
    webhook_id INTEGER,
    production_url TEXT,
    last_uptime_status TEXT,
    last_scan_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, github_url)
);

CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    repo_id TEXT REFERENCES repos(id) ON DELETE CASCADE,
    health_score INTEGER,
    vulnerabilities_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    commit_sha TEXT,
    report_json TEXT,
    scan_type TEXT DEFAULT 'full' CHECK (scan_type IN ('full', 'diff')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
    error TEXT,
    autofix_pr_url TEXT,
    changelog_summary TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ── Indices ───────────────────────────────────────────────────────────────────
-- These cover every hot query path. Check with EXPLAIN QUERY PLAN if adding new queries.

-- scans: most queries filter by repo_id, then sort by created_at
CREATE INDEX IF NOT EXISTS idx_scans_repo_created  ON scans(repo_id, created_at DESC);

-- scans: commit-SHA deduplication cache lookup
CREATE INDEX IF NOT EXISTS idx_scans_commit        ON scans(repo_id, commit_sha) WHERE commit_sha IS NOT NULL;

-- scans: status filter (processing scans on startup reset, stats queries)
CREATE INDEX IF NOT EXISTS idx_scans_status        ON scans(status);

-- repos: user dashboard load
CREATE INDEX IF NOT EXISTS idx_repos_user_created  ON repos(user_id, created_at DESC);

-- repos: URL lookup for anonymous scans and webhook routing
CREATE INDEX IF NOT EXISTS idx_repos_url           ON repos(github_url);

-- repos: monitoring worker queries
CREATE INDEX IF NOT EXISTS idx_repos_monitoring    ON repos(is_monitoring) WHERE is_monitoring = 1;

-- users: OAuth login lookup (github_id already has UNIQUE index, this is redundant but explicit)
CREATE INDEX IF NOT EXISTS idx_users_github_id     ON users(github_id);
