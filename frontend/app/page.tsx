"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchPlatformStats } from "@/services/api";
import { PlatformStats } from "@/types";
import Link from "next/link";
import {
  ArrowRight, Shield, GitBranch, Activity,
  Eye, Wrench, Bell, Globe, Terminal, Lock,
  TrendingUp, ChevronRight, AlertTriangle,
} from "lucide-react";

/* ── small reusable components ── */

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "16px", background: "var(--border-strong)" }} />;
}

function FeatureCard({
  icon: Icon, title, desc, accent,
}: { icon: React.ElementType; title: string; desc: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "var(--green-dim)" : "var(--surface-alt)",
        border: `1px solid ${accent ? "var(--green-border)" : "var(--border-subtle)"}`,
        borderRadius: "10px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
        transition: "border-color 0.15s",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: accent ? "rgba(34,197,94,0.12)" : "var(--surface-elevated)",
          border: `1px solid ${accent ? "var(--green-border)" : "var(--border-subtle)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={accent ? "var(--green)" : "var(--text-secondary)"} strokeWidth={1.75} />
      </div>
      <div>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem", letterSpacing: "-0.02em" }}>
          {title}
        </h3>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}


/* ── fake terminal exploit preview ── */
function ExploitPreview() {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.75rem",
      }}
    >
      {/* Terminal bar */}
      <div style={{ background: "#161616", padding: "10px 14px", display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: "8px", color: "var(--text-tertiary)", fontSize: "0.6875rem" }}>greenlit — proof of exploit</span>
      </div>
      <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ color: "#888" }}># Scanning your live app for BOLA vulnerabilities...</div>
        <div style={{ color: "#888" }}>&nbsp;</div>
        <div style={{ color: "#60a5fa" }}>GET /api/users/<span style={{ color: "#fbbf24" }}>2</span>/profile <span style={{ color: "#888" }}>Authorization: Bearer user_1_token</span></div>
        <div style={{ color: "#888" }}>&nbsp;</div>
        <div>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>CRITICAL</span>
          <span style={{ color: "#888" }}> → Response 200 OK — user_2 data returned</span>
        </div>
        <div style={{ color: "#888" }}>  email: &quot;<span style={{ color: "#fbbf24" }}>alice@example.com</span>&quot;</div>
        <div style={{ color: "#888" }}>  stripe_id: &quot;<span style={{ color: "#fbbf24" }}>cus_Nfds0...</span>&quot;</div>
        <div style={{ color: "#888" }}>&nbsp;</div>
        <div style={{ color: "#22c55e" }}>→ Auto-fix PR created: <span style={{ textDecoration: "underline" }}>greenlit/fix-bola-api-users</span></div>
        <div style={{ color: "#888" }}>&nbsp;</div>
        <div style={{ color: "#888" }}># Verifying fix...</div>
        <div>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>SECURE</span>
          <span style={{ color: "#888" }}> → Response 403 Forbidden — exploit closed ✓</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetchPlatformStats().then(setStats).catch(() => {});
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setIsSubmitting(true);
    router.push(`/explore?url=${encodeURIComponent(repoUrl.trim())}`);
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const exampleRepos = [
    "vercel/next.js",
    "tiangolo/fastapi",
    "supabase/supabase",
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface-main)" }}>
      <Navbar />

      <main style={{ flex: 1 }}>

        {/* ══════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════ */}
        <section
          style={{
            paddingTop: "calc(var(--nav-height) + 80px)",
            paddingBottom: "80px",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>

            {/* Badge */}
            <div className="animate-in stagger-1" style={{ marginBottom: "1.5rem" }}>
              <span className="badge badge-green">
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse-green 2s infinite" }} />
                CTO in a Box — for apps built with AI
              </span>
            </div>

            {/* Headline */}
            <h1
              className="animate-in stagger-2"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.25rem)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.08,
                marginBottom: "1.25rem",
              }}
            >
              Your app has
              <br />
              <span style={{ color: "var(--green)" }}>vulnerabilities.</span>
              <br />
              We find & fix them.
            </h1>

            {/* Subtext */}
            <p
              className="animate-in stagger-3"
              style={{
                fontSize: "1.0625rem",
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                maxWidth: "480px",
                margin: "0 auto 2.5rem",
              }}
            >
              Your CTO in a box. Paste your repo — Greenlit explains what you built,
              finds the security holes, proves they&apos;re real, and writes the fix.
              Paste it into Cursor. Done.
            </p>

            {/* Scan bar */}
            <form onSubmit={handleAnalyze} className="animate-in stagger-4">
              <div className="scan-bar" style={{ maxWidth: "560px", margin: "0 auto" }}>
                <GitBranch size={15} color="var(--text-tertiary)" strokeWidth={1.75} />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={!repoUrl.trim() || isSubmitting}
                  className="btn btn-green"
                  style={{ padding: "9px 20px", fontSize: "0.8125rem" }}
                >
                  {isSubmitting ? (
                    <span className="loading-dot">Scanning</span>
                  ) : (
                    <>
                      Scan Now
                      <ArrowRight size={13} style={{ marginLeft: "5px" }} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Example repos */}
            <div
              className="animate-in stagger-5"
              style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Try:</span>
              {exampleRepos.map((r) => (
                <button
                  key={r}
                  onClick={() => setRepoUrl(`https://github.com/${r}`)}
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--text-tertiary)",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--green)";
                    e.currentTarget.style.borderColor = "var(--green-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Stats */}
            {stats && stats.total_scans > 0 && (
              <div
                className="animate-in stagger-6"
                style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}
              >
                <StatPill value={stats.total_scans.toLocaleString()} label="repos scanned" />
                <Divider />
                <StatPill value={stats.total_vulnerabilities.toLocaleString()} label="vulnerabilities found" />
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            STATE OF VIBE CODING
        ══════════════════════════════════════════════ */}
        {stats && stats.total_scans > 0 && (
          <section style={{ borderTop: "1px solid var(--border-subtle)", padding: "80px 1.5rem" }}>
            <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                <span className="badge badge-red" style={{ marginBottom: "1rem" }}>
                  <TrendingUp size={10} />
                  Live Data
                </span>
                <h2 style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "0.75rem" }}>
                  State of Vibe Coding
                </h2>
                <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: "34rem", margin: "0 auto" }}>
                  Real data from AI-built apps scanned on Greenlit. The numbers are worse than you&apos;d think.
                </p>
              </div>

              <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {stats.total_scans.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>repos scanned</div>
                </div>

                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "#f87171", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {stats.pct_repos_with_criticals}%
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>have critical vulnerabilities</div>
                </div>

                <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {stats.total_vulnerabilities.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>vulnerabilities found</div>
                </div>

                {stats.avg_health_score !== null && (
                  <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.5rem" }}>
                    <div style={{
                      fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      color: stats.avg_health_score >= 80 ? "var(--green)" : stats.avg_health_score >= 60 ? "#f59e0b" : "#f87171",
                    }}>
                      {stats.avg_health_score}/100
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>average health score</div>
                  </div>
                )}

                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "#f87171", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {stats.total_criticals.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>critical issues found</div>
                </div>

                <div style={{ background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: "10px", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--green)", lineHeight: 1 }}>Free</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>to scan your first repo</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            PROOF OF EXPLOIT — the differentiator
        ══════════════════════════════════════════════ */}
        <section style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "80px 1.5rem" }}>
          <div className="proof-grid" style={{ maxWidth: "var(--max-width)", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>

            <div>
              <div style={{ marginBottom: "1rem" }}>
                <span className="badge badge-red">
                  <AlertTriangle size={10} />
                  The gap every other scanner misses
                </span>
              </div>
              <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.2, marginBottom: "1rem" }}>
                We don&apos;t just find it.
                <br />
                <span style={{ color: "var(--green)" }}>We prove it.</span>
              </h2>
              <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Every other scanner reads your code and says &ldquo;BOLA found.&rdquo; Greenlit sends the actual
                HTTP request to your live app, shows you the stolen data, generates the fix,
                then proves the exploit is closed. Before any hacker finds it.
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                The Lovable 48-day BOLA that leaked 18,000 users would have been caught on
                day one. Static scanners missed it. Runtime probing wouldn&apos;t have.
              </p>
            </div>

            <ExploitPreview />
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════ */}
        <section style={{ padding: "80px 1.5rem" }}>
          <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "0.5rem" }}>
                Three steps. Thirty seconds.
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                No setup. No config. No security expertise needed.
              </p>
            </div>

            <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--border-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "12px", overflow: "hidden" }}>
              {[
                { n: "01", title: "Paste your repo", desc: "Any public GitHub URL. No signup needed. Works with Lovable, Bolt, v0, Cursor, Replit — anything built with AI.", icon: GitBranch },
                { n: "02", title: "Understand what you built", desc: "Greenlit explains your app architecture in plain English. Like a CTO explaining your app to you over coffee.", icon: Terminal },
                { n: "03", title: "Fix with one click", desc: "Copy the AI-generated fix prompt, paste into Cursor or your IDE, done. No security expertise needed.", icon: Shield },
              ].map((step) => (
                <div
                  key={step.n}
                  style={{
                    background: "var(--surface-alt)",
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>
                      {step.n}
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                    <step.icon size={14} color="var(--green)" strokeWidth={1.75} />
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════════ */}
        <section style={{ borderTop: "1px solid var(--border-subtle)", padding: "80px 1.5rem" }}>
          <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "0.5rem" }}>
                Built for founders who ship with AI
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: "420px", margin: "0 auto" }}>
                You built it with Lovable. We make sure it&apos;s not a liability.
              </p>
            </div>

            <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              <FeatureCard
                icon={Eye}
                title="Plain-English Report"
                desc="No jargon. Every vulnerability explained as what an attacker could actually do to your users. A 10-year-old should understand it."
              />
              <FeatureCard
                icon={Lock}
                accent
                title="Proof of Exploit"
                desc="We probe your live app and show the exact attack that works. Not theoretical. Real stolen data, real HTTP request, real proof."
              />
              <FeatureCard
                icon={Activity}
                title="Continuous Monitoring"
                desc="Connect your repo. Every push triggers a diff scan. Know within minutes if a new commit introduced a vulnerability."
              />
              <FeatureCard
                icon={Wrench}
                title="Auto-Fix PRs"
                desc="One click to generate a Pull Request with the fix already written. Review, merge, done. No hunting Stack Overflow."
              />
              <FeatureCard
                icon={TrendingUp}
                title="Health Score Trend"
                desc="Track your app's security score over time. Benchmark against 10,000+ vibe-coded apps. Show investors you're improving."
              />
              <FeatureCard
                icon={Bell}
                title="Critical Alerts"
                desc="Email alert the moment a new critical vulnerability lands on your main branch. Before your users notice."
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════════ */}
        <section id="pricing" style={{ borderTop: "1px solid var(--border-subtle)", padding: "80px 1.5rem" }}>
          <div style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "0.5rem" }}>
                Start free. Pay when it saves you.
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                Cheaper than one hour of a security consultant.
              </p>
            </div>

            {/* Pricing cards */}
            <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", maxWidth: "860px", margin: "0 auto 2.5rem" }}>
              {/* Free */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>Free</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em" }}>₹0</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  {["1 repo", "Public repos only", "Full security audit", "Health score", "Plain-English report"].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--green)", fontSize: "0.75rem" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <Link href="/" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>Start Free</Link>
              </div>

              {/* Starter — featured */}
              <div style={{ background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: "12px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
                <div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)" }}>
                  <span style={{ background: "var(--green)", color: "#000", fontSize: "0.625rem", fontWeight: 700, padding: "2px 12px", borderRadius: "0 0 6px 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Most Popular
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>Indie</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em" }}>₹499</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>/mo</span>
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>~$6/mo · Less than one pizza</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  {["3 private repos", "Continuous monitoring", "Scan history + trends", "Email alerts", "Priority support"].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--green)", fontSize: "0.75rem" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href={`${apiBase}/auth/github/login`} className="btn btn-green" style={{ width: "100%", justifyContent: "center" }}>Get Started</a>
              </div>

              {/* Builder */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>Pro</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em" }}>₹1,999</span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>/mo</span>
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", marginTop: "2px" }}>~$24/mo · Cheaper than one Fiverr audit</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  {["Unlimited repos", "Auto-Fix PRs", "Proof of Exploit probing", "Public security badge", "Team dashboard", "API access"].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--green)", fontSize: "0.75rem" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href={`${apiBase}/auth/github/login`} className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>Go Pro</a>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <Globe size={12} />
              India-first pricing · US/EU pay in $ · Annual = 2 months free
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════ */}
        <section style={{ borderTop: "1px solid var(--border-subtle)", padding: "100px 1.5rem" }}>
          <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.04em", marginBottom: "1rem" }}>
              Scan your repo.
              <br />
              <span style={{ color: "var(--green)" }}>Right now. Free.</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              91% of AI-built apps have vulnerabilities. Check if yours is in the other 9%.
            </p>
            <a
              href={`${apiBase}/auth/github/login`}
              className="btn btn-green"
              style={{ padding: "13px 32px", fontSize: "0.9375rem" }}
            >
              Sign in with GitHub
              <ChevronRight size={15} style={{ marginLeft: "6px" }} />
            </a>
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              No credit card · Public repos always free · Cancel anytime
            </p>
            <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>Built in India 🇮🇳 · For the world</span>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
