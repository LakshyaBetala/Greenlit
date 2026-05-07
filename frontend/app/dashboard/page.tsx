"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMonitoredRepos, fetchRepos, fetchGitHubUser,
  trackRepo, triggerScan, fetchRepoHistory, getUserPlan,
} from "@/services/api";
import { MonitoredRepo, Repository, GitHubUser } from "@/types";
import DashboardHeader from "@/components/DashboardHeader";
import MonitoredRepoCard from "@/components/MonitoredRepoCard";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import ShareModal from "@/components/ShareModal";
import {
  Search, GitBranch, ArrowRight, RefreshCw, Shield, Activity,
  AlertTriangle, BarChart3, Plus,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [monitoredRepos, setMonitoredRepos] = useState<MonitoredRepo[]>([]);
  const [repoHistories, setRepoHistories] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [addUrl, setAddUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [scanningRepos, setScanningRepos] = useState<Set<string>>(new Set());
  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    repoId: string;
    scanId: string;
    repoName: string;
  }>({ isOpen: false, repoId: "", scanId: "", repoName: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [userPlan, setUserPlan] = useState<string>("free");
  const [planLimits, setPlanLimits] = useState<{ repos: number; monitoring: boolean; dast: boolean }>({ repos: 1, monitoring: false, dast: false });

  useEffect(() => {
    const token = localStorage.getItem("github_token");
    if (!token) {
      router.push("/");
      return;
    }
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const [reposData, userData] = await Promise.all([
        fetchMonitoredRepos().catch(() => []),
        fetchGitHubUser().catch(() => null),
      ]);
      setMonitoredRepos(reposData);
      setUser(userData);

      // Load plan from localStorage (set by auth callback)
      try {
        const stored = localStorage.getItem("gh_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u.id) {
            const planData = await getUserPlan(u.id).catch(() => null);
            if (planData) {
              setUserPlan(planData.plan || "free");
              setPlanLimits(planData.limits || { repos: 1, monitoring: false, dast: false });
            }
          }
        }
      } catch {}


      // Load history for each repo
      const histories: Record<string, number[]> = {};
      for (const repo of reposData) {
        try {
          const history = await fetchRepoHistory(repo.id);
          histories[repo.id] = history.map(h => h.health_score).reverse();
        } catch {
          histories[repo.id] = [];
        }
      }
      setRepoHistories(histories);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      if (error instanceof Error && error.message.includes("authentication")) {
        localStorage.removeItem("github_token");
        router.push("/");
      }
    } finally {
      setLoading(false);
      setUserLoading(false);
    }
  };

  // Stats
  const totalRepos = monitoredRepos.length;
  const avgScore = monitoredRepos.length > 0
    ? Math.round(
        monitoredRepos
          .filter(r => r.latest_scan?.health_score != null)
          .reduce((sum, r) => sum + (r.latest_scan?.health_score ?? 0), 0)
        / Math.max(monitoredRepos.filter(r => r.latest_scan?.health_score != null).length, 1)
      )
    : 0;
  const totalVulns = monitoredRepos.reduce((sum, r) => sum + (r.latest_scan?.vulnerabilities_count ?? 0), 0);
  const activeMonitors = monitoredRepos.filter(r => r.is_monitoring).length;

  // Filter
  const filteredRepos = searchQuery
    ? monitoredRepos.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : monitoredRepos;

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAddLoading(true);
    try {
      const repo = await trackRepo(addUrl.trim());
      setMonitoredRepos(prev => [repo, ...prev]);
      setAddUrl("");
      // Auto-trigger scan
      handleScanNow(repo.id);
    } catch (err) {
      console.error("Failed to track repo:", err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleScanNow = async (repoId: string) => {
    setScanningRepos(prev => new Set(prev).add(repoId));
    try {
      const { scan_id } = await triggerScan(repoId);
      // Navigate to explore page to show scan progress
      const repo = monitoredRepos.find(r => r.id === repoId);
      if (repo) {
        router.push(`/explore?url=${encodeURIComponent(repo.github_url)}`);
      }
    } catch (err) {
      console.error("Failed to trigger scan:", err);
    } finally {
      setScanningRepos(prev => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  const handleToggleMonitor = async (repoId: string, enabled: boolean) => {
    setMonitoredRepos(prev =>
      prev.map(r => r.id === repoId ? { ...r, is_monitoring: enabled ? 1 : 0 } : r)
    );
  };

  const handleViewReport = (repoId: string) => {
    const repo = monitoredRepos.find(r => r.id === repoId);
    if (repo) {
      router.push(`/explore?url=${encodeURIComponent(repo.github_url)}`);
    }
  };

  const handleShare = (repoId: string, scanId: string, repoName: string) => {
    setShareData({ isOpen: true, repoId, scanId, repoName });
  };

  const S = {
    page: { minHeight: "100vh", background: "var(--surface-main)", display: "flex", flexDirection: "column" as const },
    main: { maxWidth: "var(--max-width)", margin: "0 auto", padding: "2rem 1.5rem", flex: 1 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" },
    statCard: { background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.25rem" },
    addBar: { display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-elevated)", border: "1px solid var(--border-strong)", borderRadius: "10px", padding: "6px 6px 6px 14px", marginBottom: "2rem", transition: "border-color 0.15s" },
    addInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-mono), monospace", fontSize: "0.8125rem" },
    repoGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" },
    searchWrap: { position: "relative" as const },
    searchInput: { background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "7px", padding: "7px 12px 7px 32px", fontSize: "0.8125rem", color: "var(--text-primary)", outline: "none", width: "180px" },
  };

  return (
    <div style={S.page}>
      <DashboardHeader
        username={user?.login}
        avatarUrl={user?.avatar_url}
        plan={userPlan}
        loading={userLoading}
      />

      <main style={S.main}>

        {/* ── Plan limit warning ── */}
        {!loading && userPlan === "free" && totalRepos >= 1 && (
          <div
            className="animate-in"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "10px",
              padding: "0.875rem 1.25rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <AlertTriangle size={14} color="#f59e0b" strokeWidth={2} />
              <span style={{ color: "#f59e0b", fontSize: "0.8125rem", fontWeight: 600 }}>
                Free plan — 1 repo limit reached
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                Upgrade to track up to 3 repos with private access and uptime monitoring.
              </span>
            </div>
            <a href="/pricing" className="btn btn-green" style={{ fontSize: "0.75rem", padding: "5px 14px", whiteSpace: "nowrap" }}>
              Upgrade to Starter →
            </a>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="animate-in stagger-1 stats-grid" style={S.statsGrid}>
          {[
            { icon: GitBranch, label: "Repos Tracked", value: totalRepos, color: "var(--text-secondary)" },
            { icon: BarChart3, label: "Avg Health Score", value: avgScore > 0 ? avgScore : "—", color: "var(--green)" },
            { icon: AlertTriangle, label: "Total Vulnerabilities", value: totalVulns, color: "#ef4444" },
            { icon: Activity, label: "Active Monitors", value: activeMonitors, color: "var(--green)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={S.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                <Icon size={14} color={color} strokeWidth={1.75} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Add Repo Bar ── */}
        <div className="animate-in stagger-2" style={{ marginBottom: "2rem" }}>
          <form onSubmit={handleAddRepo}>
            <div style={S.addBar}>
              <Plus size={15} color="var(--text-tertiary)" strokeWidth={1.75} />
              <input
                type="text"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="Track a new repo — paste GitHub URL"
                style={S.addInput}
                id="add-repo-input"
              />
              <button
                type="submit"
                disabled={!addUrl.trim() || addLoading}
                className="btn btn-green"
                style={{ padding: "8px 18px", fontSize: "0.8125rem" }}
                id="add-repo-button"
              >
                {addLoading ? <span className="loading-dot">Adding</span> : <>Track & Scan <ArrowRight size={12} style={{ marginLeft: "4px" }} /></>}
              </button>
            </div>
          </form>
        </div>

        <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "2rem" }} />

        {/* ── Repos Header ── */}
        <div className="animate-in stagger-3">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: 0 }}>
              Monitored Repositories
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={S.searchWrap}>
                <Search size={12} color="var(--text-tertiary)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={S.searchInput}
                  id="search-monitored-input"
                />
              </div>
              <button
                onClick={() => { setLoading(true); loadDashboardData(); }}
                disabled={loading}
                className="btn btn-ghost"
                style={{ padding: "7px 10px" }}
              >
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              </button>
            </div>
          </div>

          {!loading && filteredRepos.length > 0 && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "1rem" }}>
              {filteredRepos.length} of {monitoredRepos.length} repositories
            </p>
          )}

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>Loading your repos...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <EmptyState
              icon={searchQuery ? Search : Shield}
              title={searchQuery ? "No results" : "No repos tracked yet"}
              description={searchQuery ? "Try adjusting your search." : "Paste a GitHub URL above to start monitoring your first repo."}
              actionLabel={searchQuery ? "Clear search" : undefined}
              onAction={searchQuery ? () => setSearchQuery("") : undefined}
            />
          ) : (
            <div className="repo-grid" style={S.repoGrid}>
              {filteredRepos.map((repo) => (
                <MonitoredRepoCard
                  key={repo.id}
                  repo={repo}
                  history={repoHistories[repo.id] || []}
                  onToggleMonitor={handleToggleMonitor}
                  onScanNow={handleScanNow}
                  onViewReport={handleViewReport}
                  onShare={handleShare}
                  scanLoading={scanningRepos.has(repo.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ShareModal
        isOpen={shareData.isOpen}
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
        repoId={shareData.repoId}
        scanId={shareData.scanId}
        repoName={shareData.repoName}
      />
    </div>
  );
}
