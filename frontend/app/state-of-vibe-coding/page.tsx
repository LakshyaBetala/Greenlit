"use client";

/**
 * State of Vibe Coding — public aggregate report.
 *
 * The viral hook. Pulls /api/public/breakdown to render a "How risky is
 * what we're building?" page using real data from every public scan
 * we've run. Updates daily as more scans accumulate.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldAlert, TrendingUp, Cpu, Sparkles, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Breakdown {
  global: {
    total_scans: number;
    total_repos: number;
    total_vulnerabilities: number;
    total_criticals: number;
    avg_health_score: number | null;
    pct_repos_with_criticals: number;
  };
  scans_analyzed: number;
  total_findings: number;
  top_vulnerabilities: { title: string; count: number }[];
  severity_distribution: { severity: "critical" | "high" | "medium" | "low"; count: number }[];
  platform_distribution: { platform: string; count: number }[];
}

const FALLBACK: Breakdown = {
  global: {
    total_scans: 0,
    total_repos: 0,
    total_vulnerabilities: 0,
    total_criticals: 0,
    avg_health_score: null,
    pct_repos_with_criticals: 0,
  },
  scans_analyzed: 0,
  total_findings: 0,
  top_vulnerabilities: [],
  severity_distribution: [
    { severity: "critical", count: 0 },
    { severity: "high", count: 0 },
    { severity: "medium", count: 0 },
    { severity: "low", count: 0 },
  ],
  platform_distribution: [],
};

const SEV_COLOR: Record<string, string> = {
  critical: "var(--sev-critical)",
  high: "var(--sev-high)",
  medium: "var(--sev-medium)",
  low: "var(--sev-low)",
};

export default function StateOfVibeCodingPage() {
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/breakdown`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d || FALLBACK))
      .catch(() => setData(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const d = data || FALLBACK;
  const sevTotal = d.severity_distribution.reduce((sum, s) => sum + s.count, 0) || 1;
  const platformTotal = d.platform_distribution.reduce((sum, p) => sum + p.count, 0) || 1;
  const maxTitleCount = d.top_vulnerabilities[0]?.count || 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-main)", color: "var(--text-primary)" }}>
      <Navbar />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "5rem 1.5rem 4rem" }}>
        {/* Hero */}
        <header style={{ marginBottom: "3rem" }}>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: "0.75rem",
            }}
          >
            State of Vibe Coding · {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" })}
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            What we found in{" "}
            <span style={{ color: "var(--green)" }}>{d.global.total_scans.toLocaleString()}</span>{" "}
            AI-built apps.
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "1rem",
              fontSize: "1rem",
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            Every app scanned by Greenlit contributes to this dataset. Real apps,
            real attacks, real findings. Updated daily.
          </p>
        </header>

        {/* Headline stats */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "4rem",
          }}
        >
          <StatTile
            stat={`${d.global.pct_repos_with_criticals}%`}
            label="of AI-built apps ship with at least one critical exploit"
            icon={ShieldAlert}
            tone="alert"
          />
          <StatTile
            stat={d.global.avg_health_score ? `${d.global.avg_health_score}/100` : "—"}
            label="average health score across all scans"
            icon={TrendingUp}
            tone="neutral"
          />
          <StatTile
            stat={d.global.total_vulnerabilities.toLocaleString()}
            label="vulnerabilities surfaced to date"
            icon={Sparkles}
            tone="neutral"
          />
          <StatTile
            stat={d.global.total_criticals.toLocaleString()}
            label="critical-severity findings prevented"
            icon={Cpu}
            tone="success"
          />
        </section>

        {/* Severity distribution */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Where the risk lives
          </h2>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              background: "var(--surface-alt)",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: "1rem" }}>
              {d.severity_distribution.map((s) => {
                const pct = (s.count / sevTotal) * 100;
                return (
                  <div
                    key={s.severity}
                    title={`${s.severity}: ${s.count}`}
                    style={{
                      width: `${pct}%`,
                      background: SEV_COLOR[s.severity],
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {d.severity_distribution.map((s) => (
                <div key={s.severity}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: SEV_COLOR[s.severity],
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-tertiary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                      }}
                    >
                      {s.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                    {s.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top vulnerabilities */}
        <section style={{ marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            The fifteen most common findings
          </h2>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              background: "var(--surface-alt)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
            }}
          >
            {loading && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }} className="loading-dot">
                Loading
              </p>
            )}
            {!loading && d.top_vulnerabilities.length === 0 && (
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", margin: 0 }}>
                Not enough scans yet. Run one to seed the data.
              </p>
            )}
            {d.top_vulnerabilities.map((v) => {
              const pct = (v.count / maxTitleCount) * 100;
              return (
                <div key={v.title}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {v.title}
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-tertiary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {v.count.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      borderRadius: 999,
                      background: "var(--surface-main)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--green)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Platform distribution */}
        {d.platform_distribution.length > 0 && (
          <section style={{ marginBottom: "4rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: "1rem",
              }}
            >
              Where the apps come from
            </h2>
            <div
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                background: "var(--surface-alt)",
                padding: "1.5rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              {d.platform_distribution.map((p) => {
                const pct = ((p.count / platformTotal) * 100).toFixed(0);
                return (
                  <div
                    key={p.platform}
                    style={{
                      padding: "0.5rem 0.9rem",
                      background: "var(--surface-main)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      {p.platform}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-tertiary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section
          style={{
            border: "1px solid var(--green-border)",
            background: "var(--green-dim)",
            borderRadius: 12,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-primary)",
              maxWidth: 540,
              margin: "0 auto 1.25rem",
              lineHeight: 1.55,
            }}
          >
            Want to know if your app is in the {d.global.pct_repos_with_criticals}%?
          </p>
          <Link
            href="/dashboard"
            className="btn btn-green"
            style={{ padding: "0.65rem 1.5rem", fontSize: "0.9rem", gap: 6 }}
          >
            Scan it — free, no card
            <ArrowRight size={14} />
          </Link>
          <p
            style={{
              marginTop: "1rem",
              color: "var(--text-tertiary)",
              fontSize: "0.75rem",
            }}
          >
            Data anonymised — repo names and source code never appear here.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface StatTileProps {
  stat: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  tone: "alert" | "neutral" | "success";
}

function StatTile({ stat, label, icon: Icon, tone }: StatTileProps) {
  const accent =
    tone === "alert"
      ? "var(--sev-critical)"
      : tone === "success"
        ? "var(--green)"
        : "var(--text-secondary)";

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "var(--surface-alt)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
      }}
    >
      <Icon size={18} style={{ color: accent }} />
      <p
        style={{
          fontSize: "1.875rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0.75rem 0 0.25rem",
        }}
      >
        {stat}
      </p>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.82rem",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}
