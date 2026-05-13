"use client";

/**
 * BreachProof — Zone 3 of the v2 result page.
 *
 * Terminal-style block that shows the actual HTTP request + response used
 * to verify the exploit. Inlined inside breach cards (severity >= high).
 *
 * Falls back to a code-excerpt presentation when the proof data didn't
 * come from a live DAST probe.
 *
 * Spec: specs/2026-05-13-product-redesign.md §2.4.
 */

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  request?: string;
  response?: string;
  capturedAt?: string;
  fileExcerpt?: string;
  filePath?: string;
}

/** Redact obvious PII patterns (emails) before rendering. */
function redact(text: string): string {
  return text.replace(
    /([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g,
    (_match, local: string, domain: string) =>
      `${local[0]}${"*".repeat(Math.max(local.length - 1, 1))}@${domain[0]}***.${domain.split(".").slice(-1)[0]}`,
  );
}

export default function BreachProof({
  request,
  response,
  capturedAt,
  fileExcerpt,
  filePath,
}: Props) {
  const [copied, setCopied] = useState(false);
  const hasLiveProof = Boolean(request && response);

  const copyToClipboard = () => {
    const text = hasLiveProof
      ? `${request}\n${response}`
      : fileExcerpt || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: "#000",
        border: "1px solid #1e1e1e",
        borderRadius: "8px",
        marginTop: "0.75rem",
        overflow: "hidden",
        fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#0a0a0a",
          padding: "8px 12px",
          borderBottom: "1px solid #1e1e1e",
          fontSize: "10px",
          color: "#666",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{hasLiveProof ? "The exploit" : "Source evidence"}</span>
        <button
          onClick={copyToClipboard}
          aria-label="Copy proof"
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            padding: 0,
          }}
        >
          {copied ? (
            <>
              <Check style={{ width: 11, height: 11 }} /> copied
            </>
          ) : (
            <>
              <Copy style={{ width: 11, height: 11 }} /> copy
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <pre
        style={{
          margin: 0,
          padding: "14px",
          fontSize: "12px",
          lineHeight: 1.55,
          color: "#eee",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "240px",
          overflow: "auto",
        }}
      >
        {hasLiveProof ? (
          <>
            <span style={{ color: "#22c55e" }}>{redact(request!)}</span>
            {"\n"}
            <span style={{ color: response!.includes("200") ? "#fca5a5" : "#ddd" }}>
              {redact(response!)}
            </span>
          </>
        ) : (
          <>
            {filePath && (
              <span style={{ color: "#666" }}>
                {"// "}
                {filePath}
                {"\n"}
              </span>
            )}
            {fileExcerpt || "// No proof available — finding came from static analysis."}
          </>
        )}
      </pre>

      {capturedAt && (
        <div
          style={{
            padding: "6px 14px",
            borderTop: "1px solid #1e1e1e",
            fontSize: "10px",
            color: "#444",
          }}
        >
          Proof captured {capturedAt}
        </div>
      )}
    </div>
  );
}
