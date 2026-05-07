"use client";

import { useState } from "react";
import { X, Copy, Check, Link, Code2, Image } from "lucide-react";

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

  if (!isOpen) return null;

  const frontendUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const reportUrl = `${frontendUrl}/report/${scanId}`;
  const badgeUrl = `${backendUrl}/api/public/badge/${repoId}`;

  const embeds = [
    {
      id: "link",
      icon: Link,
      label: "Report Link",
      value: reportUrl,
      description: "Direct link to your public report",
    },
    {
      id: "markdown",
      icon: Code2,
      label: "Markdown Badge",
      value: `[![Greenlit](${badgeUrl})](${reportUrl})`,
      description: "Add to your README.md",
    },
    {
      id: "html",
      icon: Code2,
      label: "HTML Badge",
      value: `<a href="${reportUrl}"><img src="${badgeUrl}" alt="Greenlit Health Score" /></a>`,
      description: "Embed in any webpage",
    },
    {
      id: "badge-only",
      icon: Image,
      label: "Badge Image URL",
      value: badgeUrl,
      description: "SVG badge image URL",
    },
  ];

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-lg mx-4 animate-in"
        style={{ maxHeight: "85vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4"
             style={{ borderBottom: "1px solid var(--ink-subtle)" }}>
          <div>
            <h2 className="text-headline" style={{ fontSize: "1.125rem" }}>Share Report</h2>
            <p style={{ color: "var(--ink-dim)", fontSize: "0.8125rem", marginTop: "2px" }}>
              {repoName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: "6px" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Preview */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center p-6 rounded-lg"
               style={{ background: "var(--ink-subtle)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeUrl}
              alt="Greenlit badge preview"
              style={{ height: "20px" }}
            />
          </div>
          <p className="text-center mt-2" style={{ color: "var(--ink-dim)", fontSize: "0.75rem" }}>
            Badge preview
          </p>
        </div>

        {/* Embed Options */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {embeds.map((embed) => (
            <div key={embed.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <embed.icon className="w-3.5 h-3.5" style={{ color: "var(--ink-gold)" }} />
                  <span style={{ color: "var(--text-primary)", fontSize: "0.8125rem", fontWeight: 500 }}>
                    {embed.label}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(embed.id, embed.value)}
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px", fontSize: "0.6875rem", gap: "4px" }}
                >
                  {copiedField === embed.id ? (
                    <><Check className="w-3 h-3" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <div
                className="w-full p-3 rounded-md text-code overflow-x-auto"
                style={{
                  background: "var(--ink-subtle)",
                  border: "1px solid var(--ink-muted)",
                  fontSize: "0.75rem",
                  color: "var(--ink-mid)",
                  whiteSpace: "nowrap",
                }}
              >
                {embed.value}
              </div>
              <p style={{ color: "var(--ink-dim)", fontSize: "0.6875rem", marginTop: "4px" }}>
                {embed.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
