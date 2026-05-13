"use client";

/**
 * ScanProgress — v2 loading state.
 *
 * Replaces the single-spinner wait with a 5-step animated reveal that
 * shows the founder what's happening so they don't bail during the
 * 30–60s scan.
 *
 * Spec: specs/2026-05-13-product-redesign.md §2.6.
 */

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface Props {
  repoLabel?: string;
}

const STEPS = [
  "Cloning your repo",
  "Reading your code (Sonnet 4.6)",
  "Attacking your live URL (14 checks)",
  "Comparing to 10,000+ AI-built apps",
  "Writing your report",
];

// Approximate seconds for each step — total ~60s, matches typical scan duration.
// These are display estimates; real progress is unknowable without server SSE.
const STEP_DURATIONS_MS = [6_000, 18_000, 14_000, 10_000, 12_000];

export default function ScanProgress({ repoLabel }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let totalElapsed = 0;
    const advance = (idx: number) => {
      if (cancelled || idx >= STEPS.length) return;
      const delay = STEP_DURATIONS_MS[idx] ?? 8_000;
      totalElapsed += delay;
      setTimeout(() => {
        if (cancelled) return;
        // Never set past the last step — last step shows "Writing..." until scan completes.
        setActiveIndex(Math.min(idx + 1, STEPS.length - 1));
        advance(idx + 1);
      }, delay);
    };
    advance(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: "32rem", margin: "0 auto", padding: "1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2
          className="text-headline"
          style={{ fontSize: "1.5rem", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}
        >
          Running deep scan
        </h2>
        {repoLabel && (
          <p
            className="text-code"
            style={{
              display: "inline-block",
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "3px 10px",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {repoLabel}
          </p>
        )}
      </div>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {STEPS.map((label, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                background: isActive ? "rgba(34,197,94,0.05)" : "var(--surface-elevated)",
                border: `1px solid ${isActive ? "rgba(34,197,94,0.25)" : "var(--border-subtle)"}`,
                borderRadius: "8px",
                opacity: isDone ? 0.55 : 1,
                transition: "all 200ms ease",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "20px",
                  height: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: isDone ? "var(--green, #22c55e)" : isActive ? "var(--green, #22c55e)" : "#444",
                }}
              >
                {isDone ? (
                  <Check style={{ width: 16, height: 16 }} />
                ) : isActive ? (
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                ) : (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#333" }} />
                )}
              </span>
              <span
                style={{
                  fontSize: "0.9rem",
                  color: isActive ? "var(--text-primary, #eee)" : "var(--text-secondary)",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.7rem",
                  color: "#555",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Step {i + 1}/{STEPS.length}
              </span>
            </li>
          );
        })}
      </ol>

      <p
        style={{
          textAlign: "center",
          marginTop: "1.5rem",
          fontSize: "0.75rem",
          color: "var(--text-tertiary, #444)",
        }}
      >
        Typical scan takes 45–90 seconds. Larger repos can take up to 5 minutes.
      </p>
    </div>
  );
}
