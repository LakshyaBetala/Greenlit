"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HealthScoreRing from "@/components/HealthScoreRing";
import Link from "next/link";
import {
  Shield, AlertTriangle, Code2, Layers, ChevronRight,
  Copy, Check, Lock,
} from "lucide-react";

interface PublicReport {
  scan_id: string;
  health_score: number | null;
  vulnerabilities_count: number;
  critical_count: number;
  commit_sha: string | null;
  scan_type: string;
  completed_at: string | null;
  report: {
    simple_explanation?: string;
    tech_stack?: { name: string; category: string; purpose: string }[];
    vulnerabilities?: { title: string; severity: string; description: string; file: string }[];
    platform_detected?: string | null;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ReportClient() {
  const params = useParams();
  const scanId = params?.scanId as string;
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    fetch(`${API_BASE}/api/public/report/${scanId}`)
      .then(res => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [scanId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--ink-black)" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-4 loading-dot"
                 style={{ background: "var(--ink-gold)" }} />
            <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>Loading report...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--ink-black)" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--ink-dim)" }} />
            <h2 className="text-headline mb-2" style={{ fontSize: "1.25rem" }}>Report not found</h2>
            <p style={{ color: "var(--ink-mid)", fontSize: "0.875rem" }}>
              This report may not exist or has been removed.
            </p>
            <Link href="/" className="btn btn-secondary mt-6">Scan a repo</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const r = report.report;
  const score = report.health_score ?? 0;
  const vulns = r.vulnerabilities || [];
  const techStack = r.tech_stack || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ink-black)" }}>
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">

          {/* ── Header ── */}
          <div className="animate-in stagger-1 text-center mb-12">
            <div className="mb-6">
              <span className="badge badge-gold" style={{ fontSize: "0.6875rem", padding: "4px 12px" }}>
                <Shield className="w-3 h-3" />
                Public Safety Report
              </span>
            </div>

            <HealthScoreRing score={score} size="lg" />

            <h1 className="font-display mt-6 mb-2"
                style={{ fontSize: "1.75rem", color: "var(--ink-white)" }}>
              Health Score: {score}/100
            </h1>

            {report.commit_sha && (
              <p style={{ color: "var(--ink-dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                Commit: {report.commit_sha.slice(0, 7)}
                {report.completed_at && ` • ${new Date(report.completed_at).toLocaleDateString()}`}
              </p>
            )}

            {r.platform_detected && (
              <div className="mt-3">
                <span className="badge" style={{
                  background: "var(--ink-subtle)",
                  border: "1px solid var(--ink-muted)",
                  color: "var(--ink-mid)",
                  fontSize: "0.6875rem",
                  padding: "3px 10px",
                }}>
                  Built with {r.platform_detected}
                </span>
              </div>
            )}
          </div>

          {/* ── Share Button ── */}
          <div className="animate-in stagger-2 flex justify-center gap-3 mb-12">
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary"
              style={{ fontSize: "0.8125rem", padding: "8px 16px" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <Link
              href="/"
              className="btn btn-primary"
              style={{ fontSize: "0.8125rem", padding: "8px 16px" }}
            >
              Scan Your Repo
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ── What This App Does ── */}
          {r.simple_explanation && (
            <div className="animate-in stagger-3 surface-card p-6 mb-6">
              <h2 className="text-headline mb-3 flex items-center gap-2" style={{ fontSize: "1rem" }}>
                <Code2 className="w-4 h-4" style={{ color: "var(--ink-gold)" }} />
                What This App Does
              </h2>
              <p style={{ color: "var(--ink-mid)", fontSize: "0.9375rem", lineHeight: 1.7 }}>
                {r.simple_explanation}
              </p>
            </div>
          )}

          {/* ── Vulnerabilities ── */}
          {vulns.length > 0 && (
            <div className="animate-in stagger-4 surface-card p-6 mb-6">
              <h2 className="text-headline mb-4 flex items-center gap-2" style={{ fontSize: "1rem" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--ink-rose)" }} />
                Security Issues ({vulns.length})
              </h2>
              <div className="flex flex-col gap-3">
                {vulns.slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                       style={{ background: "var(--ink-subtle)" }}>
                    <span className={`badge ${
                      v.severity === "critical" ? "badge-rose" :
                      v.severity === "high" ? "badge-amber" :
                      "badge-dim"
                    }`} style={{ fontSize: "0.625rem", padding: "2px 6px", flexShrink: 0 }}>
                      {v.severity}
                    </span>
                    <div>
                      <p style={{ color: "var(--ink-white)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "4px" }}>
                        {v.title}
                      </p>
                      <p style={{ color: "var(--ink-mid)", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                        {v.description}
                      </p>
                      <p style={{ color: "var(--ink-dim)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                        {v.file}
                      </p>
                    </div>
                  </div>
                ))}
                {vulns.length > 5 && (
                  <p style={{ color: "var(--ink-dim)", fontSize: "0.8125rem", textAlign: "center", padding: "8px" }}>
                    + {vulns.length - 5} more issues. Sign in to see the full report.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Tech Stack ── */}
          {techStack.length > 0 && (
            <div className="animate-in stagger-5 surface-card p-6 mb-6">
              <h2 className="text-headline mb-4 flex items-center gap-2" style={{ fontSize: "1rem" }}>
                <Layers className="w-4 h-4" style={{ color: "var(--ink-gold)" }} />
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {techStack.map((t, i) => (
                  <span key={i} className="badge" style={{
                    background: "var(--ink-subtle)",
                    border: "1px solid var(--ink-muted)",
                    color: "var(--ink-light)",
                    fontSize: "0.75rem",
                    padding: "4px 10px",
                  }}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Powered by ── */}
          <div className="animate-in stagger-6 text-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                 style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-subtle)" }}>
              <Shield className="w-3.5 h-3.5" style={{ color: "var(--ink-gold)" }} />
              <span style={{ color: "var(--ink-mid)", fontSize: "0.8125rem" }}>
                Protected by <Link href="/" style={{ color: "var(--ink-gold)", fontWeight: 600 }}>Greenlit</Link>
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
