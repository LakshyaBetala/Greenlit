"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Check, X, Zap, Shield, Rocket, Globe, Server, ChevronDown } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PlanFeature {
  label: string;
  free: boolean | string;
  starter: boolean | string;
  builder: boolean | string;
}

const FEATURES: PlanFeature[] = [
  { label: "Repos tracked",        free: "1",    starter: "3",   builder: "Unlimited" },
  { label: "Public repos",         free: true,   starter: true,  builder: true },
  { label: "Private repos",        free: false,  starter: true,  builder: true },
  { label: "SAST security scan",   free: true,   starter: true,  builder: true },
  { label: "Health score",         free: true,   starter: true,  builder: true },
  { label: "Architecture map",     free: true,   starter: true,  builder: true },
  { label: "Deploy guide",         free: true,   starter: true,  builder: true },
  { label: "Git & GitHub guide",   free: true,   starter: true,  builder: true },
  { label: "Uptime monitoring",    free: false,  starter: true,  builder: true },
  { label: "DAST live probe",      free: false,  starter: false, builder: true },
  { label: "Proof of exploit",     free: false,  starter: false, builder: true },
  { label: "Auto-Fix PR",          free: false,  starter: false, builder: true },
  { label: "Priority support",     free: false,  starter: false, builder: true },
];

const FAQS = [
  {
    q: "Do I need a credit card for the free plan?",
    a: "No. The free plan never asks for payment details. You get 1 public repo scan, the full security report, architecture map, and our GitHub & deploy guides — forever free.",
  },
  {
    q: "What is a DAST live probe?",
    a: "DAST (Dynamic Application Security Testing) hits your deployed app with 14 real attack patterns — SQL injection, XSS, exposed .env files, CORS misconfiguration, and more. Unlike SAST which reads code, DAST finds what's actually exploitable at runtime. Each check returns the exact HTTP request and response.",
  },
  {
    q: "What is Auto-Fix PR?",
    a: "After a scan, Greenlit generates a pull request with code-level patches for the vulnerabilities it found. One click to review, merge, and ship — no manual patching required.",
  },
  {
    q: "I'm in India — what payment options do you support?",
    a: "Indian users are automatically routed to Razorpay, which supports UPI, debit cards, net banking, and wallets — no international card needed. Pricing is in INR at purchasing-power parity: ₹299/mo Starter, ₹999/mo Builder.",
  },
  {
    q: "Is my code stored on your servers?",
    a: "No. Greenlit clones your repo into an isolated sandbox, scans it, then deletes the files immediately. We only store the scan report JSON — never your source code.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the billing portal anytime. You keep access until the end of the billing period, then drop to the free plan — no data loss.",
  },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("rzp-script")) { resolve(true); return; }
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === true)  return <Check className="w-4 h-4 mx-auto" style={{ color: "var(--green)" }} />;
  if (val === false) return <X className="w-4 h-4 mx-auto" style={{ color: "var(--text-tertiary)" }} />;
  return <span style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 500 }}>{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontWeight: 500, textAlign: "left", gap: "1rem" }}
      >
        {q}
        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", color: "var(--text-tertiary)" }} />
      </button>
      {open && (
        <p style={{ padding: "0 1.25rem 1rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{a}</p>
      )}
    </div>
  );
}

function PricingInner() {
  const params = useSearchParams();
  const upgraded = params.get("upgraded") === "1";
  const [inr, setInr] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) setInr(true);
    } catch {}
    try {
      const stored = localStorage.getItem("gh_user");
      if (stored) { const u = JSON.parse(stored); setUserId(u.id || null); }
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
          country: inr ? "IN" : "US",
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
        alert(data.message || "Payment not configured. Add STRIPE_SECRET_KEY to .env");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openRazorpay(data: Record<string, unknown>, plan: "starter" | "builder") {
    const loaded = await loadRazorpayScript();
    if (!loaded) { alert("Razorpay failed to load. Please try again."); return; }
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

  const price = { starter: inr ? "₹299" : "$7", builder: inr ? "₹999" : "$29" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-main)" }}>
      <Navbar />

      {upgraded && (
        <div style={{ background: "var(--green-dim)", borderBottom: "1px solid var(--green)", padding: "0.75rem 1.5rem", textAlign: "center", color: "var(--green)", fontWeight: 600 }}>
          You&apos;re upgraded! Your new plan is active. Welcome to Greenlit Pro.
        </div>
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--green-dim)", border: "1px solid var(--green)", borderRadius: 999, padding: "0.3rem 0.9rem", marginBottom: "1.25rem" }}>
            <Shield className="w-3.5 h-3.5" style={{ color: "var(--green)" }} />
            <span style={{ color: "var(--green)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.05em" }}>PRICING</span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.15 }}>
            Security that pays for itself
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.75rem", fontSize: "1.05rem", maxWidth: 500, margin: "0.75rem auto 0" }}>
            One critical vulnerability costs more than a year of Builder. Find it before attackers do.
          </p>

          {/* Currency toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0", marginTop: "1.75rem", background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "0.25rem" }}>
            <button onClick={() => setInr(false)} style={{ padding: "0.35rem 1.1rem", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", background: !inr ? "var(--green)" : "transparent", color: !inr ? "#000" : "var(--text-secondary)", transition: "all 0.15s" }}>
              USD $
            </button>
            <button onClick={() => setInr(true)} style={{ padding: "0.35rem 1.1rem", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", background: inr ? "var(--green)" : "transparent", color: inr ? "#000" : "var(--text-secondary)", transition: "all 0.15s" }}>
              INR ₹
            </button>
          </div>
          {inr && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "0.78rem", marginTop: "0.5rem" }}>
              Purchasing-power parity · Razorpay (UPI / cards / net banking)
            </p>
          )}
        </div>

        {/* ── Plan cards ── */}
        <div
          className="pricing-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginBottom: "4rem" }}
        >
          {/* Free */}
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <p style={{ color: "var(--text-tertiary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Free</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--text-primary)" }}>$0</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>/forever</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.4rem" }}>Scan your first app. No card ever.</p>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {["1 public repo", "Full SAST security scan", "Health score & architecture map", "Deploy guide", "GitHub & Git guide"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{f}</span>
                </li>
              ))}
              {["Uptime monitoring", "DAST probe", "Auto-Fix PR"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--text-tertiary)" }} />
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard" className="btn btn-ghost" style={{ textAlign: "center", marginTop: "auto", display: "block" }}>
              Get started free
            </Link>
          </div>

          {/* Starter — featured */}
          <div style={{ border: "2px solid var(--green)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#000", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.08em", padding: "0.25rem 0.9rem", borderRadius: 999, whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            <div>
              <p style={{ color: "var(--green)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Starter</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{price.starter}</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>/mo</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.4rem" }}>For solo founders shipping real products.</p>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {["3 repos (public + private)", "Full SAST security scan", "Health score & architecture map", "Deploy guide + free-tier optimization", "Uptime monitoring (5-min checks)", "Email alerts on downtime"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{f}</span>
                </li>
              ))}
              {["DAST probe", "Auto-Fix PR"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--text-tertiary)" }} />
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={!!loadingPlan}
              className="btn btn-green"
              style={{ textAlign: "center", marginTop: "auto", opacity: loadingPlan === "starter" ? 0.7 : 1 }}
            >
              {loadingPlan === "starter" ? "Redirecting…" : `Upgrade — ${price.starter}/mo`}
            </button>
          </div>

          {/* Builder */}
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <p style={{ color: "var(--text-tertiary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Builder</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{price.builder}</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.85rem" }}>/mo</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.4rem" }}>Everything, including DAST and Auto-Fix.</p>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {["Unlimited repos (public + private)", "Full SAST security scan", "Health score & architecture map", "Deploy guide + free-tier optimization", "Uptime monitoring (1-min checks)", "DAST probe — 14 runtime checks", "Proof of exploit (request + response)", "Auto-Fix PR — 1-click patches", "Priority support (< 24h)"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade("builder")}
              disabled={!!loadingPlan}
              className="btn btn-ghost"
              style={{ textAlign: "center", marginTop: "auto", opacity: loadingPlan === "builder" ? 0.7 : 1 }}
            >
              {loadingPlan === "builder" ? "Redirecting…" : `Upgrade — ${price.builder}/mo`}
            </button>
          </div>
        </div>

        {/* ── Feature comparison table ── */}
        <div style={{ marginBottom: "4rem" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.35rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>Full feature comparison</h2>
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-elevated)" }}>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", color: "var(--text-tertiary)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>Feature</th>
                  {(["Free", "Starter", "Builder"] as const).map(p => (
                    <th key={p} style={{ padding: "0.75rem 1rem", textAlign: "center", color: p === "Starter" ? "var(--green)" : "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 700 }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.label} style={{ borderBottom: i < FEATURES.length - 1 ? "1px solid var(--border-subtle)" : "none", background: i % 2 === 0 ? "transparent" : "var(--surface-elevated)" }}>
                    <td style={{ padding: "0.6rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{f.label}</td>
                    <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}><FeatureCell val={f.free} /></td>
                    <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}><FeatureCell val={f.starter} /></td>
                    <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}><FeatureCell val={f.builder} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Social proof stats ── */}
        <div
          className="stats-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "4rem" }}
        >
          {[
            { icon: <Shield className="w-5 h-5" />, stat: "91%", label: "of AI-built apps have at least 1 high-severity vuln" },
            { icon: <Zap className="w-5 h-5" />,    stat: "60s",  label: "average scan time — faster than a coffee" },
            { icon: <Globe className="w-5 h-5" />,   stat: "$0",   label: "to find your first critical — free, no card" },
            { icon: <Rocket className="w-5 h-5" />,  stat: "14×",  label: "runtime attack checks in one DAST probe" },
          ].map(({ icon, stat, label }) => (
            <div key={stat} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", padding: "1.5rem", textAlign: "center" }}>
              <div style={{ color: "var(--green)", marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>{icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{stat}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.35rem", lineHeight: 1.45 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: "4rem" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.35rem", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>Questions & answers</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxWidth: 700, margin: "0 auto" }}>
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>

        {/* ── Enterprise CTA ── */}
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", background: "var(--surface-elevated)", padding: "2.5rem", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
            <Server className="w-6 h-6" style={{ color: "var(--green)" }} />
          </div>
          <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.2rem", marginBottom: "0.5rem" }}>Team or enterprise?</h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 1.25rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Volume pricing, SSO, audit logs, dedicated SLA — reach out and we&apos;ll set you up within 24 hours.
          </p>
          <a href="mailto:almmatix@gmail.com?subject=Greenlit Enterprise" className="btn btn-ghost">
            Contact us
          </a>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--surface-main)" }} />}>
      <PricingInner />
    </Suspense>
  );
}
