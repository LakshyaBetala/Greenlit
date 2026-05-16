"use client";

/**
 * Scan compare — /compare/[repoId]
 *
 * Pulls scan history for the repo, picks the two most recent (or the
 * two scan_ids passed in via ?from=&to=), and renders a delta view:
 *   - New findings (in latest, not in older)
 *   - Resolved findings (in older, not in latest)
 *   - Persisting findings (in both)
 *
 * Built client-side from /api/public/report/{scanId} responses.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Pause,
} from "lucide-react";
import type { Vulnerability } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface HistoryItem {
  id: string;
  health_score: number | null;
  vulnerabilities_count: number;
  critical_count: number;
  commit_sha: string | null;
  scan_type: string;
  created_at: string;
}

interface ReportEnvelope {
  scan_id: string;
  health_score: number | null;
  report: {
    vulnerabilities?: Vulnerability[];
  };
}

function fingerprint(v: Vulnerability): string {
  return `${(v.title || "").toLowerCase()}|${(v.file || "").toLowerCase()}|${v.line ?? ""}`;
}

export default function ScanComparePage() {
  const params = useParams();
  const search = useSearchParams();
  const repoId = params?.repoId as string;
  const fromOverride = search.get("from") || "";
  const toOverride = search.get("to") || "";

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [fromReport, setFromReport] = useState<ReportEnvelope | null>(null);
  const [toReport, setToReport] = useState<ReportEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    (async () => {
      try {
        const histRes = await fetch(`${API_BASE}/api/repos/${repoId}/history`, {
          credentials: "include",
        });
        const hist: HistoryItem[] = histRes.ok ? await histRes.json() : [];
        if (cancelled) return;
        setHistory(hist);

        const completed = hist.filter((h) => h.id);
        const newestId = toOverride || completed[0]?.id;
        const olderId = fromOverride || completed[1]?.id;

        if (!newestId || !olderId) {
          setError("Need at least two completed scans for this repo.");
          setLoading(false);
          return;
        }

        const [newR, oldR] = await Promise.all([
          fetch(`${API_BASE}/api/public/report/${newestId}`).then((r) =>
            r.ok ? r.json() : null,
          ),
          fetch(`${API_BASE}/api/public/report/${olderId}`).then((r) =>
            r.ok ? r.json() : null,
          ),
        ]);
        if (cancelled) return;
        setToReport(newR);
        setFromReport(oldR);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoId, fromOverride, toOverride]);

  const { added, resolved, persisted } = useMemo(() => {
    const newVulns = toReport?.report?.vulnerabilities || [];
    const oldVulns = fromReport?.report?.vulnerabilities || [];
    const newMap = new Map(newVulns.map((v) => [fingerprint(v), v]));
    const oldMap = new Map(oldVulns.map((v) => [fingerprint(v), v]));

    const added: Vulnerability[] = [];
    const resolved: Vulnerability[] = [];
    const persisted: Vulnerability[] = [];

    newVulns.forEach((v) => {
      const fp = fingerprint(v);
      if (!oldMap.has(fp)) added.push(v);
      else persisted.push(v);
    });
    oldVulns.forEach((v) => {
      const fp = fingerprint(v);
      if (!newMap.has(fp)) resolved.push(v);
    });

    return { added, resolved, persisted };
  }, [fromReport, toReport]);

  const scoreDelta =
    toReport?.health_score != null && fromReport?.health_score != null
      ? toReport.health_score - fromReport.health_score
      : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-main)", color: "var(--text-primary)" }}>
      <Navbar />

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "5rem 1.5rem 4rem" }}>
        <header style={{ marginBottom: "2rem" }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: "0.78rem",
              color: "var(--text-tertiary)",
              display: "inline-block",
              marginBottom: "1rem",
            }}
          >
            ← Dashboard
          </Link>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ArrowLeftRight size={22} style={{ color: "var(--green)" }} />
            What changed between scans
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Side-by-side diff of two scans of the same repo.
          </p>
        </header>

        {loading && (
          <p className="loading-dot" style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            Loading scans
          </p>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "1.5rem",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              background: "var(--surface-alt)",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
            }}
          >
            {error}{" "}
            <Link href="/dashboard" style={{ color: "var(--green)" }}>
              Trigger a new scan
            </Link>{" "}
            to compare.
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Headline delta */}
            <section
              style={{
                padding: "1.5rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                background: "var(--surface-alt)",
                marginBottom: "1rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.25rem",
              }}
            >
              <DeltaTile
                icon={AlertCircle}
                label="New findings"
                value={added.length}
                tone={added.length > 0 ? "warn" : "good"}
              />
              <DeltaTile
                icon={CheckCircle2}
                label="Resolved"
                value={resolved.length}
                tone={resolved.length > 0 ? "good" : "neutral"}
              />
              <DeltaTile
                icon={Pause}
                label="Persisting"
                value={persisted.length}
                tone={persisted.length > 0 ? "warn" : "neutral"}
              />
              {scoreDelta != null && (
                <DeltaTile
                  icon={ArrowRight}
                  label="Score change"
                  value={scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
                  tone={scoreDelta >= 0 ? "good" : "warn"}
                />
              )}
            </section>

            <DiffSection
              title="New findings"
              hint="Surfaced for the first time in the latest scan."
              vulns={added}
              empty="Nothing new. Everything that was there is still there — or has been resolved."
              tone="warn"
            />

            <DiffSection
              title="Resolved findings"
              hint="Present in the previous scan, gone now. Probably your fix or upstream patch."
              vulns={resolved}
              empty="No findings resolved between these two scans."
              tone="good"
            />

            <DiffSection
              title="Still present"
              hint="Showed up in both scans. Either ignored, or still on the to-do."
              vulns={persisted}
              empty="No persisting findings."
              tone="neutral"
              collapsed
            />

            {history.length > 2 && (
              <section style={{ marginTop: "2rem" }}>
                <h2
                  style={{
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-tertiary)",
                    fontWeight: 600,
                  }}
                >
                  All scans for this repo
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0.75rem 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {history.slice(0, 10).map((h) => (
                    <li key={h.id}>
                      <Link
                        href={`/report/${h.id}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          fontSize: "0.825rem",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 6,
                          background: "var(--surface-alt)",
                        }}
                      >
                        <span>
                          {new Date(h.created_at).toLocaleString()} ·{" "}
                          {(h.commit_sha || "").slice(0, 7) || h.scan_type}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>
                          {h.health_score ?? "?"}/100 · {h.vulnerabilities_count} findings
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

interface DeltaTileProps {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: number | string;
  tone: "good" | "warn" | "neutral";
}

function DeltaTile({ icon: Icon, label, value, tone }: DeltaTileProps) {
  const accent =
    tone === "good"
      ? "var(--green)"
      : tone === "warn"
        ? "var(--sev-high)"
        : "var(--text-secondary)";
  return (
    <div>
      <Icon size={16} style={{ color: accent }} />
      <p
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          margin: "0.5rem 0 0.25rem",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", margin: 0 }}>
        {label}
      </p>
    </div>
  );
}

function DiffSection({
  title,
  hint,
  vulns,
  empty,
  tone,
  collapsed = false,
}: {
  title: string;
  hint: string;
  vulns: Vulnerability[];
  empty: string;
  tone: "good" | "warn" | "neutral";
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const accent =
    tone === "good"
      ? "var(--green)"
      : tone === "warn"
        ? "var(--sev-high)"
        : "var(--text-secondary)";

  return (
    <section
      style={{
        padding: "1.5rem",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        background: "var(--surface-alt)",
        marginBottom: "1rem",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              margin: 0,
              color: accent,
            }}
          >
            {title} · {vulns.length}
          </h2>
          <p
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.78rem",
              margin: "4px 0 0",
            }}
          >
            {hint}
          </p>
        </div>
        <span
          aria-hidden
          style={{
            color: "var(--text-tertiary)",
            fontSize: "1rem",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 150ms ease",
          }}
        >
          ›
        </span>
      </button>

      {open && (
        <div style={{ marginTop: "0.875rem" }}>
          {vulns.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", margin: 0 }}>
              {empty}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {vulns.map((v, i) => (
                <li
                  key={`${fingerprint(v)}-${i}`}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    background: "var(--surface-main)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{v.title}</div>
                  {v.file && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.72rem",
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {v.file}
                      {v.line ? `:${v.line}` : ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
