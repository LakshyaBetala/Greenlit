"use client";

/**
 * ShareModal — public-report sharing UI.
 *
 * Six artefacts: link, markdown badge, HTML badge, badge image URL,
 * shields.io endpoint, and full report JSON download.
 *
 * Theme-aware (light + dark) via the v2 token system.
 */

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Link as LinkIcon,
  Code2,
  Image as ImageIcon,
  Download,
  Shield,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  scanId: string;
  repoName: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  repoId,
  scanId,
  repoName,
}: ShareModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const frontendUrl =
    typeof window !== "undefined" ? window.location.origin : "https://greenlit.dev";
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const reportUrl = `${frontendUrl}/report/${scanId}`;
  const badgeUrl = `${backendUrl}/api/public/badge/${repoId}`;
  const shieldsUrl = `https://img.shields.io/endpoint?url=${encodeURIComponent(
    `${backendUrl}/api/public/health/${repoId}`,
  )}`;
  const jsonUrl = `${backendUrl}/api/public/report/${scanId}`;

  const embeds = [
    {
      id: "link",
      icon: LinkIcon,
      label: "Public report link",
      value: reportUrl,
      description: "Tweet it, email it, paste it in your YC app.",
    },
    {
      id: "markdown",
      icon: Code2,
      label: "Markdown badge (README)",
      value: `[![Greenlit](${badgeUrl})](${reportUrl})`,
      description: "Drop into your README — score auto-updates every 5 minutes.",
    },
    {
      id: "html",
      icon: Code2,
      label: "HTML badge",
      value: `<a href="${reportUrl}"><img src="${badgeUrl}" alt="Greenlit health score" /></a>`,
      description: "Embed in any landing page or status page.",
    },
    {
      id: "badge-only",
      icon: ImageIcon,
      label: "Badge image URL",
      value: badgeUrl,
      description: "Raw SVG. Useful for Notion, OG images, decks.",
    },
    {
      id: "shields",
      icon: Shield,
      label: "shields.io endpoint",
      value: shieldsUrl,
      description: "If you prefer the shields.io style over our native badge.",
    },
  ];

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadJson = async () => {
    setDownloading(true);
    try {
      const res = await fetch(jsonUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `greenlit-${scanId.slice(0, 8)}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* swallow — user will see the missing download */
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="surface-card"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          overflow: "auto",
          background: "var(--surface-alt)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <h2
              id="share-modal-title"
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Share this report
            </h2>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: "0.78rem",
                marginTop: 2,
                margin: 0,
              }}
            >
              {repoName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share modal"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              width: 30,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "color 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border-subtle)";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Badge preview */}
        <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              borderRadius: 10,
              background: "var(--surface-main)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeUrl}
              alt="Greenlit badge preview"
              style={{ height: 20 }}
            />
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: 8,
              color: "var(--text-tertiary)",
              fontSize: "0.72rem",
            }}
          >
            Live badge — updates within 5 min of a re-scan.
          </p>
        </div>

        {/* Download JSON CTA — split for emphasis */}
        <div style={{ padding: "0 1.5rem 1rem" }}>
          <button
            type="button"
            onClick={handleDownloadJson}
            disabled={downloading}
            style={{
              width: "100%",
              padding: "0.7rem 1rem",
              background: "var(--green-dim)",
              color: "var(--green)",
              border: "1px solid var(--green-border)",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background 0.12s ease",
            }}
          >
            <Download size={14} />
            {downloading ? "Preparing..." : "Download full report as JSON"}
          </button>
        </div>

        {/* Embed list */}
        <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {embeds.map((embed) => {
            const Icon = embed.icon;
            const isCopied = copiedField === embed.id;
            return (
              <div key={embed.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon size={13} style={{ color: "var(--text-tertiary)" }} />
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "0.825rem",
                        fontWeight: 500,
                      }}
                    >
                      {embed.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(embed.id, embed.value)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 5,
                      color: isCopied ? "var(--green)" : "var(--text-secondary)",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "color 0.12s, border-color 0.12s",
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={11} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.7rem",
                    background: "var(--surface-main)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    fontFamily: "var(--font-mono), ui-monospace, monospace",
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "auto",
                  }}
                >
                  {embed.value}
                </div>
                <p
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "0.7rem",
                    marginTop: 4,
                    margin: "4px 0 0",
                  }}
                >
                  {embed.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
