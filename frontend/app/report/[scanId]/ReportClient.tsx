"use client";

/**
 * Public report — /report/[scanId]
 *
 * The shareable artefact. Designed to look like a security attestation,
 * not a marketing landing page. Three sections: verdict header, executive
 * summary, finding list. Theme-aware (light + dark) via v2 tokens.
 *
 * Linked badge image at top doubles as the OG preview.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HealthScoreRing from "@/components/HealthScoreRing";
import VulnerabilityList from "@/components/VulnerabilityList";
import AiSidekick from "@/components/AiSidekick";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronRight,
  Copy,
  Check,
  Share2,
  Layers,
} from "lucide-react";
import type { Vulnerability } from "@/types";
import ShareModal from "@/components/ShareModal";

interface PublicReport {
  scan_id: string;
  repo_name?: string | null;
  health_score: number | null;
  vulnerabilities_count: number;
  critical_count: number;
  commit_sha: string | null;
  scan_type: string;
  completed_at: string | null;
  report: {
    simple_explanation?: string;
    advanced_explanation?: string;
    tech_stack?: { name: string; category: string; purpose?: string }[];
    vulnerabilities?: Vulnerability[];
    platform_detected?: string | null;
    verdict_headline?: string;
    verdict_subhead?: string;
    verdict_status?: "do_not_ship" | "ship_with_caution" | "ready_to_ship";
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function statusInfo(status: string | undefined, criticalCount: number) {
  if (status === "do_not_ship" || criticalCount > 0) {
    return {
      icon: ShieldX,
      label: "Do not ship",
      color: "#ef4444",
      tint: "rgba(239, 68, 68, 0.10)",
      border: "rgba(239, 68, 68, 0.30)",
    };
  }
  if (status === "ship_with_caution") {
    return {
      icon: ShieldAlert,
      label: "Ship with caution",
      color: "var(--status-warning)",
      tint: "rgba(245, 158, 11, 0.10)",
      border: "rgba(245, 158, 11, 0.30)",
    };
  }
  return {
    icon: ShieldCheck,
    label: "Ready to ship",
    color: "var(--green)",
    tint: "var(--green-dim)",
    border: "var(--green-border)",
  };
}

export default function ReportClient() {
  const params = useParams();
  const scanId = params?.scanId as string;
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    fetch(`${API_BASE}/api/public/report/${scanId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scanId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-main)" }}>
        <Navbar />
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - var(--nav-height))",
          }}
        >
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }} className="loading-dot">
            Loading report
          </p>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface-main)" }}>
        <Navbar />
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - var(--nav-height))",
            flexDirection: "column",
            gap: "1rem",
            padding: "0 1.5rem",
          }}
        >
          <Shield size={24} style={{ color: "var(--text-tertiary)" }} />
          <h2 style={{ fontSize: "1.15rem", margin: 0, color: "var(--text-primary)" }}>
            Report not found
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              textAlign: "center",
              maxWidth: 380,
              margin: 0,
            }}
          >
            This report may have been removed, or the link is wrong.
          </p>
          <Link href="/" className="btn btn-green" style={{ marginTop: "0.5rem" }}>
            Scan a repo instead
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const r = report.report || {};
  const score = report.health_score ?? 0;
  const vulns = r.vulnerabilities || [];
  const techStack = r.tech_stack || [];
  const status = statusInfo(r.verdict_status, report.critical_count);
  const StatusIcon = status.icon;
  const headline =
    r.verdict_headline ||
    (report.critical_count > 0
      ? `${report.critical_count} critical ${report.critical_count === 1 ? "exploit" : "exploits"} confirmed`
      : score >= 80
        ? "Clean — no critical exploits"
        : "Some risks to review");
  const subhead =
    r.verdict_subhead ||
    (report.critical_count > 0
      ? "An attacker can use any one of these to access user data without authentication."
      : "Greenlit ran 20 live attacks and re-read the source. Findings below.");

  const completedDate = report.completed_at
    ? new Date(report.completed_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-main)" }}>
      <Navbar />

      <main style={{ padding: "5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {/* Verdict banner */}
          <header
            style={{
              padding: "2rem",
              borderRadius: 12,
              background: status.tint,
              border: `1px solid ${status.border}`,
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            <div style={{ flex: "0 0 auto" }}>
              <HealthScoreRing score={score} size="lg" />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--surface-alt)",
                  border: `1px solid ${status.border}`,
                  color: status.color,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "0.875rem",
                }}
              >
                <StatusIcon size={11} />
                {status.label}
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.3rem, 3vw, 1.85rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {headline}
              </h1>
              <p
                style={{
                  marginTop: "0.5rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: 1.55,
                  marginBottom: 0,
                }}
              >
                {subhead}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginTop: "1rem",
                  flexWrap: "wrap",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {report.repo_name && (
                  <span style={{ color: "var(--text-secondary)" }}>
                    {report.repo_name}
                  </span>
                )}
                {report.commit_sha && (
                  <span>commit {report.commit_sha.slice(0, 7)}</span>
                )}
                {completedDate && <span>scanned {completedDate}</span>}
                {r.platform_detected && (
                  <span>built with {r.platform_detected}</span>
                )}
              </div>
            </div>
          </header>

          {/* Action row */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "2rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-outline"
              style={{ padding: "8px 14px", fontSize: "0.825rem", gap: "6px" }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="btn btn-outline"
              style={{ padding: "8px 14px", fontSize: "0.825rem", gap: "6px" }}
            >
              <Share2 size={13} />
              Share / embed
            </button>
            <Link
              href="/"
              className="btn btn-green"
              style={{
                padding: "8px 14px",
                fontSize: "0.825rem",
                gap: "6px",
                marginLeft: "auto",
              }}
            >
              Scan your repo
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Executive summary */}
          {r.simple_explanation && (
            <section
              style={{
                padding: "1.5rem",
                background: "var(--surface-alt)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                marginBottom: "1rem",
              }}
            >
              <h2
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-tertiary)",
                  fontWeight: 600,
                  margin: "0 0 0.75rem",
                }}
              >
                What this app does
              </h2>
              <p
                style={{
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {r.simple_explanation}
              </p>
            </section>
          )}

          {/* Tech stack pill row */}
          {techStack.length > 0 && (
            <section
              style={{
                padding: "1.5rem",
                background: "var(--surface-alt)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                marginBottom: "1rem",
              }}
            >
              <h2
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-tertiary)",
                  fontWeight: 600,
                  margin: "0 0 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Layers size={11} />
                Stack
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {techStack.map((t, i) => (
                  <span
                    key={`${t.name}-${i}`}
                    style={{
                      padding: "3px 9px",
                      background: "var(--surface-main)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 999,
                      fontSize: "0.72rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Vulnerabilities */}
          <section
            style={{
              padding: "1.5rem",
              background: "var(--surface-alt)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              marginBottom: "2rem",
            }}
          >
            <h2
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-tertiary)",
                fontWeight: 600,
                margin: "0 0 0.75rem",
              }}
            >
              Findings ({vulns.length})
            </h2>
            <VulnerabilityList vulnerabilities={vulns} isPaywalled />
          </section>

          {/* AI Sidekick */}
          <AiSidekick scanId={scanId} report={r} />

          {/* Trust footer */}
          <footer
            style={{
              marginTop: "3rem",
              padding: "1.5rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-tertiary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={13} style={{ color: "var(--green)" }} />
              <span>
                Attested by{" "}
                <Link
                  href="/"
                  style={{ color: "var(--green)", fontWeight: 600 }}
                >
                  Greenlit
                </Link>{" "}
                — live red-team for AI-built apps
              </span>
            </div>
            <Link
              href="/state-of-vibe-coding"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "underline",
                textDecorationColor: "var(--border-strong)",
                textUnderlineOffset: 3,
              }}
            >
              How does this app compare?
            </Link>
          </footer>
        </div>
      </main>

      <Footer />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        repoId={scanId}
        scanId={scanId}
        repoName={report.repo_name || "your repo"}
      />
    </div>
  );
}
