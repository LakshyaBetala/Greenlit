/* ═══════════════════════════════════════════════
   Greenlit — API Client
   ═══════════════════════════════════════════════ */

import { MonitoredRepo, ScanHistoryItem, PlatformStats, AnalysisReport } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Helper ────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("github_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Core: One-step analyze (paste-and-go) ─────

export async function analyzeUrl(githubUrl: string) {
  const res = await fetch(`${BASE_URL}/api/repos/analyze-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_url: githubUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Failed to start analysis");
  }

  return res.json();
}

// ── Job Polling ───────────────────────────────

export async function pollJobStatus(jobId: string) {
  const res = await fetch(`${BASE_URL}/api/repos/jobs/${jobId}`);

  if (!res.ok) {
    throw new Error("Failed to poll job status");
  }

  return res.json();
}

// ── Platform Stats ────────────────────────────

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await fetch(`${BASE_URL}/api/repos/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// ── Monitored Repos ───────────────────────────

export async function fetchMonitoredRepos(): Promise<MonitoredRepo[]> {
  const res = await fetch(`${BASE_URL}/api/repos/monitored`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch monitored repos");
  return res.json();
}

export async function trackRepo(githubUrl: string, name?: string, fullName?: string): Promise<MonitoredRepo> {
  const res = await fetch(`${BASE_URL}/api/repos/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ github_url: githubUrl, name, full_name: fullName }),
  });
  if (!res.ok) throw new Error("Failed to track repo");
  return res.json();
}

export async function untrackRepo(repoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/repos/${repoId}/track`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to untrack repo");
}

export async function toggleMonitor(repoId: string, enabled: boolean): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/repos/${repoId}/monitoring`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to toggle monitoring");
}

export async function triggerScan(repoId: string): Promise<{ scan_id: string }> {
  const res = await fetch(`${BASE_URL}/api/repos/${repoId}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to trigger scan");
  return res.json();
}

export async function fetchRepoHistory(repoId: string): Promise<ScanHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/repos/${repoId}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchScanReport(repoId: string, scanId: string): Promise<AnalysisReport> {
  const res = await fetch(`${BASE_URL}/api/repos/${repoId}/report/${scanId}`);
  if (!res.ok) throw new Error("Failed to fetch report");
  const data = await res.json();
  return data.report_json || data;
}

// ── GitHub Auth'd Endpoints ───────────────────

export async function fetchRepos() {
  const res = await fetch(`${BASE_URL}/api/repos/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch repositories");
  return res.json();
}

export async function fetchGitHubUser() {
  const token = getToken();
  if (!token) throw new Error("No authentication token found");

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}

// ── Auto-Fix & Chat ───────────────────────────

export async function generateAutoFixPR(repoName: string, vulnerabilities: Record<string, unknown>[], scanId?: string) {
  const res = await fetch(`${BASE_URL}/api/repos/autofix`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      repo_name: repoName,
      vulnerabilities,
      scan_id: scanId,
      github_token: getToken(),  // user's token so PR is created on their behalf
    }),
  });
  if (!res.ok) throw new Error("Failed to generate Auto-Fix PR");
  return res.json();
}

export async function chatWithSidekick(question: string, report: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/repos/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, report }),
  });
  if (!res.ok) throw new Error("Failed to chat with AI Sidekick");
  return res.json();
}

// ── Payments ──────────────────────────────────

export async function getUserPlan(userId: string) {
  const res = await fetch(`${BASE_URL}/api/payments/plan?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch plan");
  return res.json();
}

export async function createCheckoutSession(
  userId: string,
  plan: "starter" | "builder",
  country?: string,
) {
  const res = await fetch(`${BASE_URL}/api/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      plan,
      country: country || "",
      success_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard?upgraded=1` : "",
      cancel_url: typeof window !== "undefined" ? `${window.location.origin}/pricing?cancelled=1` : "",
    }),
  });
  if (!res.ok) throw new Error("Failed to create checkout session");
  return res.json();
}

export async function createPortalSession(userId: string) {
  const res = await fetch(`${BASE_URL}/api/payments/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "",
    }),
  });
  if (!res.ok) throw new Error("Failed to create portal session");
  return res.json();
}

export async function verifyRazorpayPayment(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  userId: string,
  plan: "starter" | "builder",
) {
  const res = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
      user_id: userId,
      plan,
    }),
  });
  if (!res.ok) throw new Error("Payment verification failed");
  return res.json();
}
