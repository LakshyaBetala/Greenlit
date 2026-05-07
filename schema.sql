-- Greenlit — Database Schema
-- ═══════════════════════════════════════════════
-- ═══════════════════════════════════════════════
-- SQLite-compatible (Phase 1 local dev)
-- Supabase/Postgres-compatible (Phase 2 production)

-- Users: GitHub-authenticated accounts
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

-- Repos: Tracked repositories
CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
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

-- Scans: Individual analysis results
CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    repo_id TEXT REFERENCES repos(id),
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_repo ON scans(repo_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_repos_user ON repos(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_monitoring ON repos(is_monitoring) WHERE is_monitoring = 1;
