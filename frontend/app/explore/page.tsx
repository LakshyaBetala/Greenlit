"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeUrl, pollJobStatus, fetchRepoHistory } from "@/services/api";
import { AnalysisReport, AnalysisTab, ExplainMode, ScanHistoryItem, ProbeJob } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MermaidDiagram from "@/components/MermaidDiagram";
import ShareModal from "@/components/ShareModal";
import ActivityTimeline from "@/components/ActivityTimeline";
import BenchmarkMetrics from "@/components/BenchmarkMetrics";
import {
  Shield, ArrowRight, RotateCcw, AlertTriangle,
  Network, Layers, Cable, Workflow, BookOpen, Bug, LinkIcon, Lightbulb,
  Lock, Share2, Github, History,
  Zap, Rocket, CheckCircle, XCircle, Globe, Server, Copy, Check,
} from "lucide-react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const githubUrl = searchParams.get("url") || "";
  const existingScanId = searchParams.get("scan_id") || "";

  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("architecture");
  const [explainMode, setExplainMode] = useState<ExplainMode>("simple");
  const [progress, setProgress] = useState("Cloning repository...");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [autofixLoading, setAutofixLoading] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [probeUrl, setProbeUrl] = useState("");
  const [probeJob, setProbeJob] = useState<ProbeJob | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeCopied, setProbeCopied] = useState<string | null>(null);
  const [fixCopied, setFixCopied] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gh_user");
      if (stored) { const u = JSON.parse(stored); setUserPlan(u.plan || "free"); }
    } catch {}
  }, []);

  // Generate an AI-assistant-ready fix prompt (the moat)
  const generateFixPrompt = (vuln: { title: string; file: string; line?: number; description: string; severity: string; fix_suggestion?: string }) => {
    const stack = report?.tech_stack?.map(t => t.name).join(", ") || "unknown";
    return `I have a security vulnerability in my app that needs to be fixed.

**Problem**: ${vuln.title}
**Severity**: ${vuln.severity.toUpperCase()}
**File**: ${vuln.file}${vuln.line ? ` (line ${vuln.line})` : ""}
**Tech Stack**: ${stack}

**What's happening**: ${vuln.description}

**What needs to change**: ${vuln.fix_suggestion || `Fix the ${vuln.title.toLowerCase()} vulnerability.`}

Please:
1. Fix this vulnerability in the specified file
2. Make sure the fix doesn't break existing functionality
3. Add a comment explaining why this fix is important
4. Keep the fix minimal — only change what's necessary`;
  };

  const copyFixPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setFixCopied(id);
    setTimeout(() => setFixCopied(null), 2000);
  };

  const startedForUrl = useRef<string>("");

  const progressSteps = [
    "Downloading your code...",
    "Reading every file...",
    "Understanding your architecture...",
    "Checking for security holes...",
    "Asking the AI for a second opinion...",
    "Building your personalized report...",
  ];

  useEffect(() => {
    if (!githubUrl) {
      router.push("/");
      return;
    }

    if (startedForUrl.current === githubUrl) return;
    startedForUrl.current = githubUrl;

    setStatus("loading");
    setReport(null);
    setError(null);
    setProgress("Cloning repository...");

    let pollInterval: NodeJS.Timeout;
    let progressIndex = 0;
    let pollFailures = 0;
    const MAX_POLL_FAILURES = 5;
    const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
    const pollStartTime = Date.now();

    const progressTimer = setInterval(() => {
      progressIndex = Math.min(progressIndex + 1, progressSteps.length - 1);
      setProgress(progressSteps[progressIndex]);
    }, 4000);

    const pollScan = (jobId: string) => {
      pollInterval = setInterval(async () => {
        if (Date.now() - pollStartTime > MAX_POLL_DURATION_MS) {
          clearInterval(pollInterval);
          clearInterval(progressTimer);
          setError("Analysis timed out after 5 minutes. Try a smaller repository.");
          setStatus("error");
          return;
        }
        try {
          const statusRes = await pollJobStatus(jobId);
          pollFailures = 0;
          if (statusRes.status === "complete") {
            clearInterval(pollInterval);
            clearInterval(progressTimer);
            setReport(statusRes.result);
            setStatus("done");
          } else if (statusRes.status === "error") {
            clearInterval(pollInterval);
            clearInterval(progressTimer);
            setError(statusRes.error || "Analysis failed.");
            setStatus("error");
          }
        } catch {
          pollFailures++;
          if (pollFailures >= MAX_POLL_FAILURES) {
            clearInterval(pollInterval);
            clearInterval(progressTimer);
            setError("Lost connection to analysis server. Please try again.");
            setStatus("error");
          }
        }
      }, 3000);
    };

    const startAnalysis = async () => {
      try {
        // If triggered from dashboard with an existing scan_id, poll it directly
        if (existingScanId) {
          pollScan(existingScanId);
          return;
        }
        const { job_id } = await analyzeUrl(githubUrl);
        pollScan(job_id);
      } catch {
        clearInterval(progressTimer);
        setError("Failed to start analysis. Is the backend running?");
        setStatus("error");
      }
    };

    startAnalysis();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(progressTimer);
    };
  }, [githubUrl, router]);

  useEffect(() => {
    if (report?.repo_id) {
      fetchRepoHistory(report.repo_id).then(setHistory).catch(console.error);
    }
  }, [report?.repo_id]);

  const repoName = githubUrl.replace("https://github.com/", "").replace(".git", "");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleStartProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probeUrl.trim()) return;
    setProbeLoading(true);
    setProbeJob(null);
    try {
      const res = await fetch(`${apiBase}/api/probe/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: probeUrl.trim() }),
      });
      const data = await res.json();
      const probeId = data.probe_id;
      setProbeJob({ status: "queued", url: probeUrl.trim() });

      const poll = setInterval(async () => {
        try {
          const r = await fetch(`${apiBase}/api/probe/${probeId}`);
          const d = await r.json();
          setProbeJob(d);
          if (d.status === "complete" || d.status === "error") {
            clearInterval(poll);
            setProbeLoading(false);
          }
        } catch {
          clearInterval(poll);
          setProbeLoading(false);
        }
      }, 2000);
    } catch {
      setProbeLoading(false);
    }
  };

  const copyProbeProof = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setProbeCopied(id);
    setTimeout(() => setProbeCopied(null), 2000);
  };

  const getDeployPlatform = (): { name: string; url: string; reason: string; free: string; oneclick?: string } => {
    const stack = report?.tech_stack?.map(t => t.name.toLowerCase()) ?? [];
    const hasNext = stack.some(s => s.includes("next"));
    const hasReact = stack.some(s => s.includes("react") || s.includes("vite"));
    const hasPython = stack.some(s => s.includes("python") || s.includes("fastapi") || s.includes("flask") || s.includes("django"));
    const hasNode = stack.some(s => s.includes("node") || s.includes("express"));

    if (hasNext || hasReact) {
      return {
        name: "Vercel",
        url: "https://vercel.com",
        reason: "Made by the creators of Next.js. Instant deploys, free tier includes 100GB bandwidth.",
        free: "100GB bandwidth/mo, unlimited projects",
        oneclick: `https://vercel.com/new/clone?repository-url=https://github.com/${repoName}`,
      };
    }
    if (hasPython) {
      return {
        name: "Railway",
        url: "https://railway.app",
        reason: "Best for Python/FastAPI apps. $5 free credits/mo. Postgres included.",
        free: "$5/mo free credits — enough for a small production app",
      };
    }
    if (hasNode) {
      return {
        name: "Render",
        url: "https://render.com",
        reason: "Great for Node/Express. Free tier includes web services + free PostgreSQL.",
        free: "Free web service (spins down after inactivity), free PostgreSQL for 90 days",
      };
    }
    return {
      name: "Vercel",
      url: "https://vercel.com",
      reason: "Best default choice for most web apps built with AI tools.",
      free: "100GB bandwidth/mo, unlimited projects",
    };
  };

  const tabs: { id: AnalysisTab; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
    { id: "timeline", label: "Roadmap", icon: History },
    { id: "architecture", label: "Architecture", icon: Network },
    { id: "tech-stack", label: "Tech Stack", icon: Layers },
    { id: "connections", label: "Connections", icon: Cable },
    { id: "data-flow", label: "Data Flow", icon: Workflow },
    { id: "explained", label: "Explained", icon: BookOpen },
    { id: "vulnerabilities", label: "Vulnerabilities", icon: Bug },
    { id: "broken-links", label: "Broken Links", icon: LinkIcon },
    { id: "improvements", label: "Improvements", icon: Lightbulb },
    { id: "probe", label: "Probe Live App", icon: Zap },
    { id: "deploy", label: "Deploy Guide", icon: Rocket },
  ];

  const handleAutofix = async () => {
    const isBuilder = userPlan === "builder";

    if (!isBuilder) {
      if (confirm("Auto-Fix PRs require the Builder plan. Upgrade now?")) {
        try {
          const ghUser = JSON.parse(localStorage.getItem("gh_user") || "{}");
          const userId = ghUser.id || "anonymous";
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${apiUrl}/api/payments/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, plan: "builder" }),
          });
          const data = await res.json();
          if (data.url) { window.location.href = data.url; return; }
          if (data.razorpay_order_id) { window.location.href = "/pricing"; return; }
        } catch (e) {
          console.error("Checkout error", e);
        }
      }
      return;
    }

    if (!report || autofixLoading || !report.vulnerabilities?.length) return;
    setAutofixLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/repos/autofix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repoName,
          vulnerabilities: report.vulnerabilities,
          scan_id: report.scan_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.pr_url) {
        setReport({ ...report, autofix_pr_url: data.pr_url });
        window.open(data.pr_url, "_blank");
      } else {
        alert(data.detail || data.message || "Failed to generate fix.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating auto-fix.");
    } finally {
      setAutofixLoading(false);
    }
  };

  const severityBadgeStyle = (severity: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      critical: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
      high: { background: "rgba(249,115,22,0.1)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.2)" },
      medium: { background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" },
      low: { background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" },
    };
    return map[severity] ?? map.low;
  };

  const severityDotColor = (severity: string) => {
    const map: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      medium: "#f59e0b",
      low: "#3b82f6",
    };
    return map[severity] ?? "#3b82f6";
  };

  const priorityBadgeStyle = (priority: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      high: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" },
      medium: { background: "rgba(249,115,22,0.1)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.2)" },
      low: { background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" },
    };
    return map[priority] ?? map.low;
  };

  const S = {
    page: { minHeight: "100vh", background: "var(--surface-main)", display: "flex", flexDirection: "column" as const },
    summaryStrip: {
      background: "var(--surface-alt)",
      borderBottom: "1px solid var(--border-subtle)",
    },
    tabBar: {
      background: "var(--surface-alt)",
      borderBottom: "1px solid var(--border-subtle)",
    },
    card: {
      background: "var(--surface-elevated)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "10px",
    },
    codeChip: {
      background: "var(--surface-main)",
      border: "1px solid var(--border-strong)",
      borderRadius: "5px",
      padding: "2px 8px",
      fontSize: "0.75rem",
      fontFamily: "var(--font-mono), monospace",
      color: "var(--text-secondary)",
    },
    tagChip: {
      background: "var(--surface-main)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "5px",
      padding: "2px 8px",
      fontSize: "0.6875rem",
      fontWeight: 500,
      color: "var(--text-secondary)",
    },
    dividerV: { width: "1px", background: "var(--border-subtle)" },
    dividerH: { height: "1px", background: "var(--border-subtle)" },
  };

  // ── LOADING STATE ──
  if (status === "loading") {
    return (
      <div style={S.page}>
        <Navbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1.5rem" }}>
          <div className="text-center animate-in">
            <div style={{ marginBottom: "2rem" }}>
              <div
                className="loading-dot"
                style={{
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "var(--green)", margin: "0 auto 1.5rem",
                }}
              />
              <h2 className="text-headline" style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                Analyzing Repository
              </h2>
              <p
                className="text-code"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "5px",
                  padding: "2px 10px",
                  display: "inline-block",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem",
                  fontSize: "0.8125rem",
                }}
              >
                {repoName}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{progress}</p>
            </div>
            <div style={{ maxWidth: "280px", margin: "0 auto" }}>
              <div style={{ height: "3px", borderRadius: "99px", overflow: "hidden", background: "var(--surface-elevated)" }}>
                <div style={{
                  height: "100%",
                  borderRadius: "99px",
                  background: "var(--green)",
                  width: "60%",
                  animation: "shimmer 2s infinite",
                  backgroundImage: `linear-gradient(90deg, var(--green) 25%, #4ade80 50%, var(--green) 75%)`,
                  backgroundSize: "200% 100%",
                }} />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (status === "error") {
    return (
      <div style={S.page}>
        <Navbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1.5rem" }}>
          <div className="text-center animate-in">
            <AlertTriangle style={{ width: "48px", height: "48px", margin: "0 auto 1.5rem", color: "var(--status-error)" }} />
            <h2 className="text-headline" style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Analysis Failed
            </h2>
            <p style={{ marginBottom: "2rem", maxWidth: "28rem", margin: "0 auto 2rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button onClick={() => window.location.reload()} className="btn btn-green" style={{ padding: "8px 16px" }}>
                <RotateCcw style={{ width: "14px", height: "14px", marginRight: "6px" }} />
                Retry
              </button>
              <button onClick={() => router.push("/")} className="btn btn-outline" style={{ padding: "8px 16px" }}>
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── RESULTS ──
  return (
    <div style={S.page}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: "64px" }}>
        {/* ── Summary Strip ── */}
        <div className="animate-in stagger-1" style={S.summaryStrip}>
          <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}>
              {/* Left: Score + Repo */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2rem" }}>
                {/* Health Score */}
                <div style={{ textAlign: "center" }}>
                  <div
                    className="text-headline"
                    style={{
                      fontSize: "3.5rem",
                      color: (report?.health_score ?? 0) >= 70 ? "var(--status-success)" :
                             (report?.health_score ?? 0) >= 40 ? "var(--status-warning)" : "var(--status-error)",
                      lineHeight: "1",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {report?.health_score ?? 0}
                  </div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px" }}>
                    / 100
                  </div>
                </div>

                <div style={S.dividerV} />

                {/* Repo info */}
                <div>
                  <h1 className="text-headline" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                    {repoName}
                  </h1>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {report?.tech_stack?.slice(0, 5).map((tech) => (
                      <span key={tech.name} style={S.tagChip}>{tech.name}</span>
                    ))}
                  </div>

                  {report?.repo_id && (
                    <div style={{ marginTop: "1rem" }}>
                      <BenchmarkMetrics repoId={report.repo_id} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Mode Toggle + Share */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="btn btn-outline"
                  style={{ padding: "8px 16px", fontSize: "0.875rem" }}
                >
                  <Share2 style={{ width: "14px", height: "14px", marginRight: "6px" }} />
                  Share Report
                </button>
                <div style={S.dividerV} />
                {/* Mode Toggle */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "2px",
                  background: "var(--surface-main)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "3px",
                }}>
                  {(["simple", "advanced"] as ExplainMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setExplainMode(mode)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: explainMode === mode ? "var(--surface-elevated)" : "transparent",
                        color: explainMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="animate-in stagger-2" style={S.tabBar}>
          <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <div style={{ display: "flex", gap: "0", overflowX: "auto" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    id={`tab-${tab.id}`}
                    style={{
                      padding: "1rem 4px",
                      marginRight: "1.25rem",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap" as const,
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${isActive ? "var(--green)" : "transparent"}`,
                      color: isActive ? "var(--green)" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <tab.icon style={{ width: "14px", height: "14px", color: isActive ? "var(--green)" : "var(--text-tertiary)" }} />
                    {tab.label}
                    {tab.id === "vulnerabilities" && (report?.vulnerabilities?.length ?? 0) > 0 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "1px 7px",
                        borderRadius: "999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.2)",
                        marginLeft: "2px",
                      }}>
                        {report!.vulnerabilities!.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* Architecture Tab */}
          {activeTab === "architecture" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "🏗️ What you built (in plain English)" : "Architecture Diagram"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "Your app is like a restaurant. Here are the parts and how they work together."
                  : "Component-level architecture showing service boundaries and communication patterns."}
              </p>
              {explainMode === "simple" && report?.tech_stack && (
                <div style={{ ...S.card, padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "3px solid var(--green)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {report.tech_stack.some(t => t.name.toLowerCase().includes("next") || t.name.toLowerCase().includes("react")) && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "1.25rem" }}>🍽️</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>THE MENU (Frontend)</span>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.6, paddingLeft: "2rem" }}>
                          This is what your customers see — buttons, pages, forms. Like the menu at a restaurant that customers browse.
                        </p>
                      </div>
                    )}
                    {report.tech_stack.some(t => ["supabase","firebase","express","fastapi","django","node"].some(k => t.name.toLowerCase().includes(k))) && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "1.25rem" }}>👨‍🍳</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>THE KITCHEN (Backend / Database)</span>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.6, paddingLeft: "2rem" }}>
                          Where the real work happens. Stores user data, processes orders, handles logins. Customers never see this directly.
                        </p>
                      </div>
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "1.25rem" }}>🔌</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>HOW THEY CONNECT</span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.6, paddingLeft: "2rem" }}>
                        The menu sends orders to the kitchen through a “window” called an API. When someone clicks “Sign Up,” the frontend sends a message to the backend.
                      </p>
                    </div>
                    <div style={{ background: "var(--surface-main)", borderRadius: "6px", padding: "0.75rem 1rem", marginTop: "0.5rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0 }}>
                        💡 Switch to “Advanced” mode (top right) to see the technical architecture diagram.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ ...S.card, padding: "2rem", minHeight: "300px" }}>
                <MermaidDiagram
                  nodes={report?.architecture?.nodes || []}
                  edges={report?.architecture?.edges || []}
                />
              </div>
            </div>
          )}

          {/* Tech Stack Tab */}
          {activeTab === "tech-stack" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "What tools your app uses" : "Technology Stack Analysis"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "Here are all the frameworks and libraries we found in your code."
                  : "Detailed breakdown of dependencies, their usage patterns, and purposes."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {report?.tech_stack?.map((tech, i) => (
                  <div key={i} style={{ ...S.card, padding: "1.25rem", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9375rem" }}>
                          {tech.name}
                        </span>
                        <span style={S.tagChip}>{tech.category}</span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{tech.purpose}</p>
                    </div>
                    {explainMode === "advanced" && tech.files_using?.length > 0 && (
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                          Used in
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {tech.files_using.map((f, j) => (
                            <span key={j} className="text-code" style={S.codeChip}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections Tab */}
          {activeTab === "connections" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "How the pieces talk to each other" : "Component Connections"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "Your app has different parts — here's how they communicate."
                  : "Inter-service communication patterns and protocols."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {report?.connections?.map((conn, i) => (
                  <div key={i} style={{ ...S.card, padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem", flexWrap: "wrap" }}>
                      <span className="text-code" style={S.codeChip}>{conn.from}</span>
                      <ArrowRight style={{ width: "14px", height: "14px", color: "var(--text-tertiary)" }} />
                      <span className="text-code" style={S.codeChip}>{conn.to}</span>
                      {explainMode === "advanced" && (
                        <span style={{ ...S.tagChip, marginLeft: "auto" }}>{conn.method}</span>
                      )}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{conn.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Flow Tab */}
          {activeTab === "data-flow" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "What happens when someone uses your app" : "Request/Response Data Flow"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "Step by step — from when a user clicks something to what happens behind the scenes."
                  : "End-to-end data flow showing how requests propagate through the system."}
              </p>
              {report?.data_flow?.map((flow, fi) => (
                <div key={fi} style={{ marginBottom: "2.5rem" }}>
                  <h3 className="text-headline" style={{ fontSize: "1.0625rem", marginBottom: "1.5rem" }}>{flow.title}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {flow.steps?.map((step, si) => (
                      <div key={si} style={{ display: "flex", gap: "1.25rem" }}>
                        {/* Timeline */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.8125rem", fontWeight: 700,
                            background: "var(--surface-elevated)",
                            border: "2px solid var(--green)",
                            color: "var(--green)",
                          }}>
                            {step.step}
                          </div>
                          {si < flow.steps.length - 1 && (
                            <div style={{ width: "1px", flex: 1, minHeight: "32px", background: "var(--border-subtle)", margin: "4px 0" }} />
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ ...S.card, padding: "1.125rem", flex: 1, marginBottom: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                              {step.action}
                            </span>
                            {explainMode === "advanced" && (
                              <span style={S.tagChip}>{step.component}</span>
                            )}
                          </div>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Explained Tab */}
          {activeTab === "explained" && (
            <div className="animate-in">
              {explainMode === "simple" ? (
                <>
                  {/* CTO in a Box — plain English */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--green-dim)", border: "1px solid var(--green-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen style={{ width: "16px", height: "16px", color: "var(--green)" }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>What you built — explained like you&apos;re 10</h2>
                      <p style={{ color: "var(--text-tertiary)", fontSize: "0.8rem", margin: 0 }}>Your personal CTO just read your code. Here&apos;s what they found.</p>
                    </div>
                  </div>

                  <div style={{ ...S.card, padding: "2rem", marginBottom: "1.25rem" }}>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "1rem", whiteSpace: "pre-wrap" }}>
                      {report?.simple_explanation}
                    </p>
                  </div>

                  {/* Tech stack in plain English */}
                  {report?.tech_stack && report.tech_stack.length > 0 && (
                    <div style={{ ...S.card, padding: "1.5rem", marginBottom: "1.25rem" }}>
                      <h3 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Layers style={{ width: "14px", height: "14px", color: "var(--green)" }} />
                        The tools your app uses
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                        {report.tech_stack.slice(0, 6).map((t, i) => (
                          <div key={i} style={{ background: "var(--surface-main)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.875rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                              <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.85rem" }}>{t.name}</span>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", lineHeight: 1.5, margin: 0 }}>{t.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick CTA: what to do next */}
                  <div style={{ ...S.card, padding: "1.25rem", borderLeft: "3px solid var(--green)", display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                    <Shield style={{ width: "18px", height: "18px", color: "var(--green)", flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem", margin: "0 0 0.25rem" }}>Your next step</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", margin: 0, lineHeight: 1.6 }}>
                        Check the <strong>Vulnerabilities</strong> tab — it lists every security problem we found, with a button to copy the exact fix prompt for Cursor or Lovable.
                        {(report?.vulnerabilities?.length ?? 0) > 0 && ` We found ${report!.vulnerabilities!.length} issue${report!.vulnerabilities!.length !== 1 ? "s" : ""}.`}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
                    Technical Architecture Overview
                  </h2>
                  <div style={{ ...S.card, padding: "2rem" }}>
                    <p style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.8,
                      fontSize: "0.875rem",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono), monospace",
                    }}>
                      {report?.advanced_explanation}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === "vulnerabilities" && (
            <div className="animate-in">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                    {explainMode === "simple" ? "Security problems we found" : "Security Vulnerabilities"}
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {explainMode === "simple"
                      ? "These are issues that could let attackers break into your app."
                      : `${report?.vulnerabilities?.length || 0} vulnerabilities detected across the codebase.`}
                  </p>
                </div>
                {report?.autofix_pr_url ? (
                  <a
                    href={report.autofix_pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{
                      background: "var(--green-dim)",
                      color: "var(--green)",
                      border: "1px solid var(--green-border)",
                      padding: "8px 16px",
                      fontSize: "0.8125rem",
                      gap: "6px",
                    }}
                  >
                    <Github style={{ width: "14px", height: "14px" }} />
                    View Fix PR
                  </a>
                ) : (
                  <button
                    onClick={handleAutofix}
                    disabled={autofixLoading || !report?.vulnerabilities?.length}
                    className="btn btn-primary"
                    style={{ padding: "8px 16px", fontSize: "0.8125rem", gap: "6px" }}
                  >
                    {autofixLoading ? (
                      <span className="loading-dot">Generating PR</span>
                    ) : (
                      <>
                        <Shield style={{ width: "14px", height: "14px" }} />
                        Generate Fix PR
                      </>
                    )}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {report?.vulnerabilities?.map((vuln, i) => (
                  <div key={i} style={{ ...S.card, padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: severityDotColor(vuln.severity), flexShrink: 0 }} />
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9375rem" }}>
                          {vuln.title}
                        </span>
                      </div>
                      <span style={{
                        ...severityBadgeStyle(vuln.severity),
                        display: "inline-flex", alignItems: "center",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}>
                        {vuln.severity}
                      </span>
                    </div>
                    <p style={{ marginBottom: explainMode === "simple" ? "0.5rem" : "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                      {vuln.description}
                    </p>
                    {explainMode === "simple" && vuln.fix_suggestion && (
                      <div style={{ background: "var(--surface-main)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "0.625rem 0.875rem", marginBottom: "0.75rem" }}>
                        <span style={{ color: "var(--text-tertiary)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>How to fix it</span>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.5, margin: "0.25rem 0 0" }}>{vuln.fix_suggestion}</p>
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
                      <span className="text-code" style={S.codeChip}>
                        {vuln.file}{vuln.line ? `:${vuln.line}` : ""}
                      </span>
                      {explainMode === "advanced" && vuln.fix_suggestion && (
                        <span style={{
                          fontSize: "0.75rem",
                          color: "var(--green)",
                          background: "var(--green-dim)",
                          border: "1px solid var(--green-border)",
                          borderRadius: "5px",
                          padding: "2px 8px",
                        }}>
                          Fix: {vuln.fix_suggestion}
                        </span>
                      )}
                      {/* Copy AI Fix Prompt — the moat */}
                      <button
                        onClick={() => copyFixPrompt(generateFixPrompt(vuln), `fix-${i}`)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          fontSize: "0.6875rem", fontWeight: 600,
                          background: "var(--green-dim)", color: "var(--green)",
                          border: "1px solid var(--green-border)",
                          borderRadius: "5px", padding: "3px 10px",
                          cursor: "pointer", transition: "all 0.15s",
                          marginLeft: "auto",
                        }}
                      >
                        {fixCopied === `fix-${i}` ? (
                          <><Check style={{ width: "10px", height: "10px" }} /> Copied!</>
                        ) : (
                          <><Copy style={{ width: "10px", height: "10px" }} /> Copy Fix for Cursor</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {(!report?.vulnerabilities || report.vulnerabilities.length === 0) && (
                  <div style={{ ...S.card, padding: "3rem", textAlign: "center" }}>
                    <Shield style={{ width: "48px", height: "48px", margin: "0 auto 1rem", color: "var(--green)" }} />
                    <p style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "1.0625rem" }}>
                      No vulnerabilities detected. Your code looks clean!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Broken Links Tab */}
          {activeTab === "broken-links" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "Broken connections in your code" : "Dead Imports & Missing Files"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "These are parts of your code that point to files or modules that don't exist."
                  : "Unresolvable imports, missing modules, and dead references."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {report?.broken_links?.map((link, i) => (
                  <div key={i} style={{ ...S.card, padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <LinkIcon style={{ width: "14px", height: "14px", color: "#fb923c" }} />
                      <span className="text-code" style={S.codeChip}>{link.file}</span>
                    </div>
                    <p style={{ marginBottom: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Import:{" "}
                      <code style={{
                        color: "#f87171",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        borderRadius: "4px",
                        padding: "1px 6px",
                        fontSize: "0.8125rem",
                        fontFamily: "var(--font-mono), monospace",
                      }}>
                        {link.import_path}
                      </code>{" "}
                      — {link.issue}
                    </p>
                    <p style={{ color: "var(--green)", fontSize: "0.875rem", fontWeight: 500 }}>
                      {link.suggestion}
                    </p>
                  </div>
                ))}
                {(!report?.broken_links || report.broken_links.length === 0) && (
                  <div style={{ ...S.card, padding: "3rem", textAlign: "center" }}>
                    <LinkIcon style={{ width: "48px", height: "48px", margin: "0 auto 1rem", color: "var(--green)" }} />
                    <p style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "1.0625rem" }}>
                      No broken links detected. All imports resolve correctly!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "Project Roadmap & History" : "Activity Timeline"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "A plain-English history of everything built or changed in this repository."
                  : "Chronological ledger of diff scans, commits, and auto-fix security patches."}
              </p>
              <div style={{ ...S.card, padding: "2rem" }}>
                <ActivityTimeline history={history} />
              </div>
            </div>
          )}

          {/* Improvements Tab */}
          {activeTab === "improvements" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                {explainMode === "simple" ? "How to make your app better" : "Improvement Recommendations"}
              </h2>
              <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {explainMode === "simple"
                  ? "Things you could add or change to make your app stronger, faster, and easier to maintain."
                  : "Prioritized technical debt and feature improvement recommendations."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {report?.improvements?.map((imp, i) => (
                  <div key={i} style={{ ...S.card, padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Lightbulb style={{ width: "16px", height: "16px", color: "#fbbf24" }} />
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9375rem" }}>
                          {imp.title}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{
                          ...priorityBadgeStyle(imp.priority),
                          display: "inline-flex", alignItems: "center",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}>
                          {imp.priority}
                        </span>
                        {explainMode === "advanced" && (
                          <span style={S.tagChip}>{imp.category}</span>
                        )}
                      </div>
                    </div>
                    <p style={{ marginBottom: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                      {imp.description}
                    </p>
                    {explainMode === "advanced" && (
                      <p style={{ color: "var(--text-tertiary)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Estimated effort: {imp.effort}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Probe Live App Tab */}
          {activeTab === "probe" && (
            <div className="animate-in">
              {/* Plan gate — DAST is Builder-only */}
              {userPlan !== "builder" && (
                <div style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  background: "var(--surface-elevated)",
                  padding: "3rem 2rem",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--green-dim)", border: "1px solid var(--green-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock style={{ width: "20px", height: "20px", color: "var(--green)" }} />
                    </div>
                  </div>
                  <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.15rem", marginBottom: "0.5rem" }}>
                    DAST Probe is a Builder feature
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "440px", margin: "0 auto 0.75rem", lineHeight: 1.6 }}>
                    Run 20 real attack checks against your live app — CORS, exposed .env, SQL injection, Supabase RLS bypass, Stripe webhook forgery, and more. See the exact HTTP proof.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "1.5rem" }}>
                    {["CORS wildcard", "Supabase RLS", "Firebase test mode", "Stripe webhook", "API keys in JS", "SQL injection"].map(f => (
                      <span key={f} style={{ fontSize: "0.72rem", background: "var(--surface-main)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "3px 10px", color: "var(--text-secondary)" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <a href="/pricing" className="btn btn-green" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Zap style={{ width: "14px", height: "14px" }} />
                    Upgrade to Builder — $29/mo
                  </a>
                  <p style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: "0.75rem" }}>
                    India? ₹999/mo via Razorpay (UPI / cards)
                  </p>
                </div>
              )}

              {/* Show probe UI only for builder */}
              {userPlan === "builder" && (<>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Zap style={{ width: "18px", height: "18px", color: "var(--green)" }} />
                  Probe Live App
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  Enter your deployed URL. Greenlit will run 20 unauthenticated security checks — CORS, exposed secrets, missing headers, rate limiting, SQL injection, Supabase RLS, Firebase rules, Stripe webhooks, and more. Takes ~30 seconds.
                </p>
                <div style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid var(--green-border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1.5rem",
                }}>
                  <strong style={{ color: "var(--green)" }}>This is what makes Greenlit different.</strong> Rafter and every other scanner only read your code. We probe your running app and show the exact HTTP request an attacker would use — with the stolen response as proof.
                </div>
              </div>

              {/* URL Input */}
              <form onSubmit={handleStartProbe} style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <div style={{
                  flex: 1, minWidth: "280px",
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--surface-elevated)", border: "1px solid var(--border-strong)",
                  borderRadius: "8px", padding: "8px 12px",
                }}>
                  <Globe style={{ width: "14px", height: "14px", color: "var(--text-tertiary)", flexShrink: 0 }} />
                  <input
                    type="text"
                    value={probeUrl}
                    onChange={e => setProbeUrl(e.target.value)}
                    placeholder="https://your-app.vercel.app"
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "var(--text-primary)", fontSize: "0.875rem",
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={probeLoading || !probeUrl.trim()}
                  className="btn btn-green"
                  style={{ padding: "10px 20px" }}
                >
                  {probeLoading ? <span className="loading-dot">Probing</span> : <><Zap style={{ width: "14px", height: "14px", marginRight: "6px" }} />Run 20 Checks</>}
                </button>
              </form>

              {/* Probe results */}
              {probeJob?.status === "scanning" || probeJob?.status === "queued" ? (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <div className="loading-dot" style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--green)", margin: "0 auto 1rem" }} />
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    Probing {probeJob.url} — checking CORS, secrets, headers, rate limits, injections...
                  </p>
                </div>
              ) : probeJob?.status === "complete" && probeJob.result ? (
                <div>
                  {/* Score summary */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem",
                    marginBottom: "2rem",
                  }}>
                    {[
                      { label: "Runtime Score", value: probeJob.result.runtime_score, color: probeJob.result.runtime_score >= 70 ? "var(--status-success)" : probeJob.result.runtime_score >= 40 ? "var(--status-warning)" : "var(--status-error)" },
                      { label: "Critical", value: probeJob.result.critical_count, color: probeJob.result.critical_count > 0 ? "var(--status-error)" : "var(--text-secondary)" },
                      { label: "High", value: probeJob.result.high_count, color: probeJob.result.high_count > 0 ? "#fb923c" : "var(--text-secondary)" },
                      { label: "Checks Run", value: probeJob.result.total_checks, color: "var(--text-secondary)" },
                    ].map(s => (
                      <div key={s.label} style={{ ...S.card, padding: "1rem", textAlign: "center" }}>
                        <div style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.04em", color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Check results */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {probeJob.result.results
                      .sort((a, b) => {
                        const order = { critical: 0, high: 1, medium: 2, low: 3 };
                        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                      })
                      .map((check, i) => (
                      <div key={i} style={{
                        ...S.card,
                        padding: "1.25rem",
                        borderLeft: check.passed ? "3px solid var(--border-subtle)" : `3px solid ${severityBadgeStyle(check.severity).color as string}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: check.passed ? "0" : "0.75rem", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            {check.passed ? (
                              <CheckCircle style={{ width: "16px", height: "16px", color: "var(--status-success)", flexShrink: 0 }} />
                            ) : (
                              <XCircle style={{ width: "16px", height: "16px", color: severityBadgeStyle(check.severity).color as string, flexShrink: 0 }} />
                            )}
                            <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9375rem" }}>{check.name}</span>
                          </div>
                          {!check.passed && (
                            <span style={{
                              ...severityBadgeStyle(check.severity),
                              display: "inline-flex", alignItems: "center",
                              padding: "2px 10px", borderRadius: "999px",
                              fontSize: "0.6875rem", fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
                            }}>
                              {check.severity}
                            </span>
                          )}
                        </div>

                        {!check.passed && (
                          <>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                              {check.description}
                            </p>

                            {/* Proof box */}
                            <div style={{ marginBottom: "0.75rem" }}>
                              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                                Proof of Exploit
                              </div>
                              <div style={{
                                background: "var(--surface-main)", border: "1px solid var(--border-subtle)",
                                borderRadius: "6px", padding: "0.75rem", fontFamily: "var(--font-mono), monospace",
                                fontSize: "0.75rem", color: "#d4d4d4", position: "relative",
                              }}>
                                <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>REQUEST</div>
                                <div style={{ color: "#9cdcfe", marginBottom: "8px", whiteSpace: "pre-wrap" }}>{check.proof_request}</div>
                                <div style={{ color: "var(--text-tertiary)", marginBottom: "4px" }}>RESPONSE</div>
                                <div style={{ color: "#ce9178", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{check.proof_response}</div>
                                <button
                                  onClick={() => copyProbeProof(`REQUEST:\n${check.proof_request}\n\nRESPONSE:\n${check.proof_response}`, `proof-${i}`)}
                                  style={{
                                    position: "absolute", top: "8px", right: "8px",
                                    background: "var(--surface-elevated)", border: "1px solid var(--border-strong)",
                                    borderRadius: "4px", padding: "3px 8px",
                                    fontSize: "0.6875rem", color: "var(--text-secondary)",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                                  }}
                                >
                                  {probeCopied === `proof-${i}` ? <><Check style={{ width: "10px", height: "10px" }} /> Copied</> : <><Copy style={{ width: "10px", height: "10px" }} /> Copy</>}
                                </button>
                              </div>
                            </div>

                            {/* Fix */}
                            <div style={{
                              background: "var(--green-dim)", border: "1px solid var(--green-border)",
                              borderRadius: "6px", padding: "0.625rem 0.875rem",
                              fontSize: "0.8125rem", color: "var(--text-secondary)",
                            }}>
                              <span style={{ color: "var(--green)", fontWeight: 600 }}>Fix: </span>
                              {check.fix}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : probeJob?.status === "error" ? (
                <div style={{ ...S.card, padding: "2rem", textAlign: "center" }}>
                  <AlertTriangle style={{ width: "32px", height: "32px", margin: "0 auto 0.75rem", color: "var(--status-error)" }} />
                  <p style={{ color: "var(--text-secondary)" }}>{probeJob.error || "Probe failed. Check the URL and try again."}</p>
                </div>
              ) : (
                <div style={{ ...S.card, padding: "2.5rem", textAlign: "center" }}>
                  <Zap style={{ width: "40px", height: "40px", margin: "0 auto 1rem", color: "var(--text-tertiary)" }} />
                  <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                    Enter your live app URL above to start the runtime security probe.
                  </p>
                </div>
              )}
              </>)}
            </div>
          )}

          {/* Deploy Guide Tab */}
          {activeTab === "deploy" && (
            <div className="animate-in">
              <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Rocket style={{ width: "18px", height: "18px", color: "var(--green)" }} />
                Deploy Your App
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "2rem" }}>
                Based on your tech stack, here&apos;s exactly how to deploy your app for free — step by step, no experience needed.
              </p>

              {report ? (() => {
                const platform = getDeployPlatform();
                const stack = report.tech_stack?.map(t => t.name.toLowerCase()) ?? [];
                const hasSupabase = stack.some(s => s.includes("supabase"));
                const hasEnvVars = report.vulnerabilities?.some(v => v.title?.toLowerCase().includes("key") || v.title?.toLowerCase().includes("secret"));

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Recommended platform */}
                    <div style={{ ...S.card, padding: "1.5rem", borderLeft: "3px solid var(--green)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                            Recommended for your stack
                          </div>
                          <h3 className="text-headline" style={{ fontSize: "1.25rem" }}>Deploy to {platform.name}</h3>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "4px" }}>{platform.reason}</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                          <span style={{ background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: "999px", padding: "3px 12px", fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>
                            FREE
                          </span>
                          <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textAlign: "right", maxWidth: "180px" }}>{platform.free}</span>
                        </div>
                      </div>
                      {platform.oneclick && (
                        <a
                          href={platform.oneclick}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-green"
                          style={{ fontSize: "0.875rem", padding: "10px 20px", gap: "8px" }}
                        >
                          <Rocket style={{ width: "14px", height: "14px" }} />
                          One-click Deploy to {platform.name}
                        </a>
                      )}
                    </div>

                    {/* Step by step */}
                    <div style={{ ...S.card, padding: "1.5rem" }}>
                      <h3 className="text-headline" style={{ fontSize: "1rem", marginBottom: "1.25rem" }}>Step-by-step guide</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {[
                          {
                            n: "1",
                            title: `Sign up at ${platform.name}`,
                            desc: `Go to ${platform.url} and create a free account. Use "Continue with GitHub" so your repos connect automatically.`,
                          },
                          {
                            n: "2",
                            title: "Connect your GitHub repo",
                            desc: `In ${platform.name}, click "New Project" or "Add New" → import your GitHub repository (${repoName}).`,
                          },
                          ...(hasEnvVars || hasSupabase ? [{
                            n: "3",
                            title: "Add your environment variables",
                            desc: `Before deploying, go to Settings → Environment Variables. Add all your API keys here (Supabase URL, service key, etc.). Never hardcode secrets in your code.`,
                          }] : []),
                          {
                            n: hasEnvVars || hasSupabase ? "4" : "3",
                            title: "Deploy",
                            desc: `Click Deploy. ${platform.name} will automatically build and deploy your app. You'll get a live URL in ~2 minutes.`,
                          },
                          {
                            n: hasEnvVars || hasSupabase ? "5" : "4",
                            title: "Set up automatic deploys",
                            desc: `Every time you push code to GitHub, ${platform.name} auto-deploys. Your app is always up to date.`,
                          },
                        ].map((step) => (
                          <div key={step.n} style={{ display: "flex", gap: "1rem" }}>
                            <div style={{
                              width: "28px", height: "28px", flexShrink: 0, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.8125rem", fontWeight: 700,
                              background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)",
                            }}>{step.n}</div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: "4px" }}>{step.title}</p>
                              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom domain */}
                    <div style={{ ...S.card, padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                      <Globe style={{ width: "20px", height: "20px", color: "var(--green)", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--text-primary)", marginBottom: "4px" }}>Add a custom domain (optional)</p>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          In {platform.name} → Settings → Domains, add your domain. Buy one at Cloudflare Registrar ($8-$10/yr). Point the DNS records as instructed. Free SSL included automatically.
                        </p>
                      </div>
                    </div>

                    {hasSupabase && (
                      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "1.25rem" }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fbbf24", marginBottom: "4px" }}>
                          ⚠ Supabase detected — important security step
                        </p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          Before going live: In Supabase → Authentication → URL Configuration, add your production URL to &quot;Site URL&quot; and &quot;Redirect URLs&quot;. Also enable Row Level Security (RLS) on all your tables — without it, any user can read all data.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ ...S.card, padding: "2.5rem", textAlign: "center" }}>
                  <Server style={{ width: "40px", height: "40px", margin: "0 auto 1rem", color: "var(--text-tertiary)" }} />
                  <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                    Run a code scan first — the deploy guide personalizes based on your tech stack.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        repoId={report?.repo_id || ""}
        scanId={report?.scan_id || ""}
        repoName={repoName}
      />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--surface-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-dot" style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--green)" }} />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
