"use client";

/**
 * Pricing page v2 — three-band geo pricing + marketing psychology.
 *
 * Bands:
 *   Standard (US/EU + most countries): $7 / $29
 *   India:                              ₹299 / ₹999
 *   Emerging economies (~50 countries): $5 / $19
 *
 * Detection: CF-IPCountry header on initial load; user can override.
 * Psychology applied:
 *   - Anchor: Builder shown side-by-side with Starter (mid-tier appears reasonable)
 *   - Loss aversion: critical-vuln-cost framing in hero
 *   - Social proof: 91% stat band at top, repo count grows in copy
 *   - Reciprocity: free plan is genuinely useful (10 scans, top-5 vulns visible)
 *   - Authority: real DAST proof example shown
 *   - Scarcity: founding-300 ribbon under Builder ("first 300 founders / lifetime price")
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Check,
  X,
  ShieldCheck,
  GitPullRequest,
  Radar,
  ChevronDown,
  Globe,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Currency = "USD" | "INR" | "EM";

interface BandPrice {
  starter: number;
  builder: number;
  display: { starter: string; builder: string; suffix: string };
}

const BANDS: Record<Currency, BandPrice> = {
  USD: {
    starter: 700,
    builder: 2900,
    display: { starter: "$7", builder: "$29", suffix: "/mo USD" },
  },
  INR: {
    starter: 29900,
    builder: 99900,
    display: { starter: "₹299", builder: "₹999", suffix: "/mo INR" },
  },
  EM: {
    starter: 500,
    builder: 1900,
    display: { starter: "$5", builder: "$19", suffix: "/mo USD" },
  },
};

const EM_COUNTRIES = new Set([
  "AR","BR","CO","MX","PE","CL","UY",
  "ID","PH","VN","TH","MY",
  "EG","NG","KE","ZA","GH","TN","MA",
  "PK","BD","LK","NP",
  "TR","UA",
]);

function inferBand(): Currency {
  if (typeof window === "undefined") return "USD";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
  } catch {}
  return "USD";
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    bullet: "Scan your first app. Find the smoking guns. No card.",
    cta: "Start scanning",
    ctaHref: "/dashboard",
    primary: false,
    features: [
      { included: true, label: "1 public repo" },
      { included: true, label: "10 scans / month" },
      { included: true, label: "Health score + architecture map" },
      { included: true, label: "Top 5 vulnerabilities (full detail)" },
      { included: false, label: "Private repos" },
      { included: false, label: "DAST live probe (20 attacks)" },
      { included: false, label: "Proof of exploit" },
      { included: false, label: "Auto-Fix PR" },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    bullet: "Three apps, continuous monitoring, sleep at night.",
    cta: "Upgrade to Starter",
    primary: false,
    badge: null as string | null,
    features: [
      { included: true, label: "3 repos (public + private)" },
      { included: true, label: "Unlimited scans" },
      { included: true, label: "All vulnerabilities (full detail)" },
      { included: true, label: "Continuous monitoring (daily re-scan)" },
      { included: true, label: "Email + Slack alerts on new critical" },
      { included: true, label: "1 free Auto-Fix PR per month" },
      { included: false, label: "DAST live probe" },
      { included: false, label: "Unlimited Auto-Fix PRs" },
    ],
  },
  {
    id: "builder",
    name: "Builder",
    bullet: "The full red-team. DAST. Auto-Fix. Run a real product.",
    cta: "Upgrade to Builder",
    primary: true,
    badge: "FOUNDER PRICE · FIRST 300 LOCK IT IN",
    features: [
      { included: true, label: "Unlimited repos (public + private)" },
      { included: true, label: "Unlimited scans" },
      { included: true, label: "DAST live probe — 20 real attacks" },
      { included: true, label: "Proof of exploit (request + response)" },
      { included: true, label: "Unlimited Auto-Fix PRs" },
      { included: true, label: "Daily monitoring + 4-channel alerts" },
      { included: true, label: "AI Sidekick — chat with your codebase" },
      { included: true, label: "Priority email (< 24h)" },
    ],
  },
];

const COMPARE_ROWS: { label: string; free: boolean | string; starter: boolean | string; builder: boolean | string; group?: string }[] = [
  { label: "Repos tracked", free: "1", starter: "3", builder: "Unlimited", group: "Scope" },
  { label: "Scans per month", free: "10", starter: "Unlimited", builder: "Unlimited" },
  { label: "Private repos", free: false, starter: true, builder: true },
  { label: "Health score + architecture map", free: true, starter: true, builder: true, group: "Insight" },
  { label: "Full vulnerability list", free: "Top 5", starter: true, builder: true },
  { label: "Plain-English explanations", free: true, starter: true, builder: true },
  { label: "AI Sidekick — chat your codebase", free: false, starter: false, builder: true },
  { label: "Continuous monitoring", free: false, starter: "Daily", builder: "Daily", group: "Defense" },
  { label: "Email alerts on new critical", free: false, starter: true, builder: true },
  { label: "Slack alerts on new critical", free: false, starter: true, builder: true },
  { label: "DAST live probe (20 attacks)", free: false, starter: false, builder: true },
  { label: "Proof of exploit (request + response)", free: false, starter: false, builder: true },
  { label: "Auto-Fix PRs", free: false, starter: "1 / month", builder: "Unlimited", group: "Fix" },
  { label: "Compare scans (delta view)", free: false, starter: true, builder: true },
  { label: "Public report + README badge", free: true, starter: true, builder: true, group: "Share" },
  { label: "Priority support", free: false, starter: false, builder: true },
];

const FAQS = [
  {
    q: "Why is 'live probe' so much more valuable than a normal scanner?",
    a: "Most scanners read code. We hit your deployed URL with 20 real attack patterns — exposed .env files, SQL injection, IDOR, Supabase RLS bypass, fake Stripe webhooks. Each finding ships with the exact request we sent and the response we got back. You can't argue with HTTP 200 OK on a payload that should have failed.",
  },
  {
    q: "Do I need a credit card for the free plan?",
    a: "No. Ever. The free plan stays free — 1 public repo, 10 scans per month, top 5 vulnerabilities visible in full. We make money on people who choose to upgrade because the product proved itself.",
  },
  {
    q: "What is Auto-Fix?",
    a: "We open a real GitHub pull request against your repo with the suggested patches applied. You review the diff. If you like it, you merge. If you don't, you close it. No magic — Greenlit just does the typing for you.",
  },
  {
    q: "I'm in India / a non-G7 country — am I overpaying?",
    a: "No. We price in three bands. Indian users pay in INR via Razorpay (UPI / cards / net banking). Twenty-five emerging-economy countries pay a lower USD rate via Stripe. Detected automatically; switchable manually if we get it wrong.",
  },
  {
    q: "What happens to my code?",
    a: "We clone your repo into an isolated sandbox, scan it, then delete the source files. We store the report JSON (health score, vulnerabilities, architecture) but never your code. If you remove a repo from monitoring, the report stays accessible to you and is purged after 90 days.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. One click in the billing portal. You keep paid features through the end of the billing period, then drop to free. No re-onboarding, no data loss.",
  },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("rzp-script")) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PricingInner() {
  const params = useSearchParams();
  const upgraded = params.get("upgraded") === "1";
  const [band, setBand] = useState<Currency>("USD");
  const [bandConfirmed, setBandConfirmed] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const initial = inferBand();
    setBand(initial);
    fetch(`${API_BASE}/api/payments/plan?user_id=__detect__`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.country) {
          if (d.country === "IN") setBand("INR");
          else if (EM_COUNTRIES.has(d.country)) setBand("EM");
          else setBand("USD");
        }
        setBandConfirmed(true);
      })
      .catch(() => setBandConfirmed(true));

    try {
      const stored = localStorage.getItem("gh_user");
      if (stored) {
        const u = JSON.parse(stored);
        setUserId(u.id || null);
      }
    } catch {}
  }, []);

  async function handleUpgrade(plan: "starter" | "builder") {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      const res = await fetch(`${API_BASE}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId || "demo-user",
          plan,
          country: band === "INR" ? "IN" : band === "EM" ? "BR" : "US",
          success_url: `${window.location.origin}/dashboard?upgraded=1`,
          cancel_url: `${window.location.origin}/pricing?cancelled=1`,
        }),
      });
      const data = await res.json();
      if (data.provider === "razorpay") {
        await openRazorpay(data, plan);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || "Payment not configured. Reach out to almmatix@gmail.com.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openRazorpay(data: Record<string, unknown>, plan: "starter" | "builder") {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Razorpay failed to load. Please try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: data.key_id,
      subscription_id: data.subscription_id,
      name: "Greenlit",
      description: `${plan === "starter" ? "Starter" : "Builder"} Plan`,
      handler: async (response: Record<string, string>) => {
        setLoadingPlan(plan);
        try {
          await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              user_id: userId || "demo-user",
              plan,
            }),
          });
          window.location.href = "/dashboard?upgraded=1";
        } finally {
          setLoadingPlan(null);
        }
      },
      theme: { color: "#22c55e" },
    });
    rzp.open();
  }

  const prices = BANDS[band].display;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-main)", color: "var(--text-primary)" }}>
      <Navbar />

      {upgraded && (
        <div
          style={{
            background: "var(--green-dim)",
            borderBottom: "1px solid var(--green-border)",
            padding: "0.75rem 1.5rem",
            textAlign: "center",
            color: "var(--green)",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Payment confirmed. Your new plan is active.
        </div>
      )}

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "5rem 1.5rem 6rem" }}>
        {/* Hero */}
        <header style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: "1rem",
            }}
          >
            Pricing
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
            One exposed{" "}
            <span style={{ color: "var(--green)" }}>.env</span> file costs more
            than{" "}
            <br className="hidden md:inline" />
            a year of Builder.
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "1rem",
              fontSize: "1rem",
              maxWidth: 540,
              margin: "1rem auto 0",
              lineHeight: 1.6,
            }}
          >
            Greenlit finds the holes attackers find. Then we open the PR that
            closes them. Start free, no card. Upgrade when it&apos;s saved you a fire.
          </p>

          {/* Geo band switcher */}
          <div
            role="tablist"
            aria-label="Currency band"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
              marginTop: "2rem",
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 999,
              padding: 3,
            }}
          >
            {(["USD", "INR", "EM"] as Currency[]).map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={band === b}
                onClick={() => setBand(b)}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  background: band === b ? "var(--green)" : "transparent",
                  color: band === b ? "#052e16" : "var(--text-secondary)",
                  transition: "all 0.12s",
                }}
              >
                {b === "USD" ? "Standard $" : b === "INR" ? "India ₹" : "Emerging $"}
              </button>
            ))}
          </div>
          <p
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.75rem",
              marginTop: "0.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Globe size={11} />
            {!bandConfirmed
              ? "Detecting your country..."
              : band === "INR"
                ? "Razorpay · UPI · debit · net banking"
                : band === "EM"
                  ? "Purchasing-power-adjusted · 25 countries"
                  : "Stripe · cards · Apple Pay · Google Pay"}
          </p>
        </header>

        {/* Plan cards */}
        <section
          className="pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "5rem",
          }}
          aria-label="Plans"
        >
          {PLANS.map((plan) => {
            const isFree = plan.id === "free";
            const priceLabel = isFree
              ? "$0"
              : plan.id === "starter"
                ? prices.starter
                : prices.builder;
            const isPrimary = plan.primary;

            return (
              <article
                key={plan.id}
                aria-label={`${plan.name} plan`}
                style={{
                  border: isPrimary
                    ? "1.5px solid var(--green)"
                    : "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  background: "var(--surface-alt)",
                  padding: "2rem 1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  position: "relative",
                  boxShadow: isPrimary ? "var(--shadow-md)" : "none",
                }}
              >
                {plan.id === "builder" && plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--green)",
                      color: "#052e16",
                      fontWeight: 700,
                      fontSize: "0.62rem",
                      letterSpacing: "0.1em",
                      padding: "0.2rem 0.7rem",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <header>
                  <p
                    style={{
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {plan.name}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.3rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "2.25rem",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {priceLabel}
                    </span>
                    {!isFree && (
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                        {prices.suffix}
                      </span>
                    )}
                    {isFree && (
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
                        forever
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.875rem",
                      marginTop: "0.5rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {plan.bullet}
                  </p>
                </header>

                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                    flex: 1,
                  }}
                >
                  {plan.features.map((f) => (
                    <li
                      key={f.label}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.55rem",
                      }}
                    >
                      {f.included ? (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          style={{
                            color: "var(--green)",
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                      ) : (
                        <X
                          size={14}
                          strokeWidth={2}
                          style={{
                            color: "var(--text-disabled)",
                            flexShrink: 0,
                            marginTop: 3,
                          }}
                        />
                      )}
                      <span
                        style={{
                          color: f.included ? "var(--text-primary)" : "var(--text-tertiary)",
                          fontSize: "0.875rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <Link
                    href={plan.ctaHref || "/dashboard"}
                    className="btn btn-outline"
                    style={{ width: "100%", justifyContent: "center", padding: "0.6rem 1rem" }}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan.id as "starter" | "builder")}
                    disabled={!!loadingPlan}
                    className={isPrimary ? "btn btn-green" : "btn btn-outline"}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "0.6rem 1rem",
                      opacity: loadingPlan === plan.id ? 0.7 : 1,
                    }}
                  >
                    {loadingPlan === plan.id ? "Redirecting..." : plan.cta}
                  </button>
                )}
              </article>
            );
          })}
        </section>

        {/* Authority strip — what's behind the price */}
        <section
          style={{
            marginBottom: "5rem",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            background: "var(--surface-alt)",
            padding: "2rem 2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2rem",
          }}
        >
          <div>
            <Radar size={20} style={{ color: "var(--green)" }} />
            <p style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem" }}>
              20 live attacks per probe
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.35rem", lineHeight: 1.55 }}>
              Including the six AI-tool-specific ones nobody else runs: Supabase RLS bypass, Firebase test mode, NextAuth misconfig, Clerk test keys, NEXT_PUBLIC secrets, fake Stripe webhooks.
            </p>
          </div>
          <div>
            <GitPullRequest size={20} style={{ color: "var(--green)" }} />
            <p style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem" }}>
              Auto-Fix opens a real PR
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.35rem", lineHeight: 1.55 }}>
              Not a code suggestion. Not a diff in a popup. A branch, a commit, and a pull request against your default branch with the patches applied.
            </p>
          </div>
          <div>
            <ShieldCheck size={20} style={{ color: "var(--green)" }} />
            <p style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.75rem" }}>
              Continuous, not one-shot
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.35rem", lineHeight: 1.55 }}>
              Every push triggers a delta scan. Daily full re-scan. If a critical surfaces between Tuesday and Thursday, you get pinged — not your customers.
            </p>
          </div>
        </section>

        {/* Comparison table */}
        <section style={{ marginBottom: "5rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
              letterSpacing: "-0.02em",
            }}
          >
            Everything in one row
          </h2>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--surface-alt)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th
                    style={{
                      padding: "0.7rem 1rem",
                      textAlign: "left",
                      color: "var(--text-tertiary)",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  />
                  {(["Free", "Starter", "Builder"] as const).map((p) => (
                    <th
                      key={p}
                      style={{
                        padding: "0.7rem 0.5rem",
                        textAlign: "center",
                        color: p === "Builder" ? "var(--green)" : "var(--text-secondary)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, idx) => {
                  const isGroupStart = !!row.group;
                  return (
                    <tr
                      key={row.label}
                      style={{
                        borderTop: isGroupStart && idx > 0 ? "1px solid var(--border-subtle)" : undefined,
                      }}
                    >
                      <td
                        style={{
                          padding: "0.55rem 1rem",
                          color: "var(--text-secondary)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {isGroupStart && (
                          <div
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: "var(--text-tertiary)",
                              marginBottom: 2,
                            }}
                          >
                            {row.group}
                          </div>
                        )}
                        {row.label}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>
                        <FeatureCell val={row.free} />
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>
                        <FeatureCell val={row.starter} />
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>
                        <FeatureCell val={row.builder} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "5rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
              letterSpacing: "-0.02em",
            }}
          >
            Honest answers
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 760 }}>
            {FAQS.map((f) => {
              const isOpen = openFaq === f.q;
              return (
                <div
                  key={f.q}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10,
                    background: "var(--surface-alt)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : f.q)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.85rem 1.1rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      textAlign: "left",
                      gap: "1rem",
                    }}
                  >
                    {f.q}
                    <ChevronDown
                      size={14}
                      style={{
                        color: "var(--text-tertiary)",
                        transition: "transform 0.15s ease",
                        transform: isOpen ? "rotate(180deg)" : "none",
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {isOpen && (
                    <p
                      style={{
                        padding: "0 1.1rem 1rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            background: "var(--surface-alt)",
            padding: "2.5rem 2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text-primary)",
              maxWidth: 520,
              margin: "0 auto 1.25rem",
              lineHeight: 1.6,
            }}
          >
            Easier path: paste your repo, see the actual holes, decide if it&apos;s
            worth $7.
          </p>
          <Link
            href="/dashboard"
            className="btn btn-green"
            style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem" }}
          >
            Run a free scan
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === true) {
    return (
      <Check
        size={14}
        strokeWidth={2.5}
        style={{ color: "var(--green)", margin: "0 auto", display: "block" }}
      />
    );
  }
  if (val === false) {
    return (
      <X
        size={14}
        strokeWidth={2}
        style={{ color: "var(--text-disabled)", margin: "0 auto", display: "block" }}
      />
    );
  }
  return (
    <span style={{ color: "var(--text-primary)", fontSize: "0.82rem", fontWeight: 500 }}>
      {val}
    </span>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "var(--surface-main)" }} />
      }
    >
      <PricingInner />
    </Suspense>
  );
}
