"use client";

/**
 * VerdictCinema — Zone 1 of the v2 result page.
 *
 * One-sentence verdict, one-line subhead, single primary CTA. This is the
 * "10/10 share-card moment" — what a founder screenshots and posts.
 *
 * Spec: specs/2026-05-13-product-redesign.md §2.2.
 */

import React from "react";
import { ArrowRight, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { AnalysisReport, VerdictStatus } from "@/types";

interface Props {
  report: AnalysisReport;
  onShowBreach?: () => void;
  onViewFullReport?: () => void;
}

/** Derive verdict_status from the report when the LLM didn't set it (Gemini-fallback path). */
function deriveStatus(report: AnalysisReport): VerdictStatus {
  if (report.verdict_status) return report.verdict_status;
  const critical = report.vulnerabilities?.filter((v) => v.severity === "critical").length ?? 0;
  const high = report.vulnerabilities?.filter((v) => v.severity === "high").length ?? 0;
  if (critical > 0) return "do_not_ship";
  if (high > 0) return "ship_with_caution";
  return "ready_to_ship";
}

function deriveHeadline(report: AnalysisReport): string {
  if (report.verdict_headline) return report.verdict_headline;
  const critical = report.vulnerabilities?.filter((v) => v.severity === "critical") ?? [];
  if (critical.length > 0) {
    const first = critical[0];
    return `${critical.length} critical ${critical.length === 1 ? "breach" : "breaches"}. ${first.title}.`;
  }
  const high = report.vulnerabilities?.filter((v) => v.severity === "high") ?? [];
  if (high.length > 0) return `${high.length} high-severity ${high.length === 1 ? "issue" : "issues"} to fix before launch.`;
  return "Your app passes. Ship it.";
}

function deriveSubhead(report: AnalysisReport): string {
  if (report.verdict_subhead) return report.verdict_subhead;
  const count = report.vulnerabilities?.length ?? 0;
  if (count === 0) return "We attacked it. We couldn't get in.";
  return `${count} issue${count === 1 ? "" : "s"} worth your attention — proof below.`;
}

const STATUS_STYLES: Record<
  VerdictStatus,
  { pillBg: string; pillFg: string; gradient: string; Icon: typeof ShieldX; label: string }
> = {
  do_not_ship: {
    pillBg: "rgba(239,68,68,0.12)",
    pillFg: "#fca5a5",
    gradient: "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.10), transparent 60%)",
    Icon: ShieldX,
    label: "Do not ship",
  },
  ship_with_caution: {
    pillBg: "rgba(245,158,11,0.12)",
    pillFg: "#fcd34d",
    gradient: "radial-gradient(circle at 50% 0%, rgba(245,158,11,0.08), transparent 60%)",
    Icon: ShieldAlert,
    label: "Ship with caution",
  },
  ready_to_ship: {
    pillBg: "rgba(34,197,94,0.12)",
    pillFg: "#86efac",
    gradient: "radial-gradient(circle at 50% 0%, rgba(34,197,94,0.10), transparent 60%)",
    Icon: ShieldCheck,
    label: "Ready to ship",
  },
};

export default function VerdictCinema({ report, onShowBreach, onViewFullReport }: Props) {
  const status = deriveStatus(report);
  const styles = STATUS_STYLES[status];
  const headline = deriveHeadline(report);
  const subhead = deriveSubhead(report);
  const { Icon } = styles;

  return (
    <section
      style={{
        background: `${styles.gradient}, var(--surface-main)`,
        borderBottom: "1px solid var(--border-subtle)",
        padding: "5rem 1.5rem 4rem",
      }}
    >
      <div style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}>
        {/* Verdict pill */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: styles.pillBg,
            color: styles.pillFg,
            padding: "5px 12px",
            borderRadius: "99px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
            border: `1px solid ${styles.pillBg}`,
          }}
        >
          <Icon style={{ width: 12, height: 12 }} />
          {styles.label}
        </span>

        {/* Headline */}
        <h1
          className="text-headline"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "0.875rem",
            color: "var(--text-primary, #eeeeee)",
            fontWeight: 700,
          }}
        >
          {headline}
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2rem",
            maxWidth: "36rem",
            margin: "0 auto 2rem",
            lineHeight: 1.5,
          }}
        >
          {subhead}
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          {status !== "ready_to_ship" && onShowBreach && (
            <button
              onClick={onShowBreach}
              className="btn btn-green"
              style={{ padding: "10px 18px", fontSize: "0.9rem", fontWeight: 600 }}
            >
              Show me the breach
              <ArrowRight style={{ width: 14, height: 14, marginLeft: 6 }} />
            </button>
          )}
          {onViewFullReport && (
            <button
              onClick={onViewFullReport}
              className="btn btn-ghost"
              style={{
                padding: "10px 18px",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
              }}
            >
              View full report
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
