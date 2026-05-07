"use client";

import { useRouter } from "next/navigation";
import { Repository } from "@/types";
import { Lock, Globe, GitBranch, ArrowRight, FileCode } from "lucide-react";

interface RepoCardProps {
  repo: Repository;
  viewMode?: "grid" | "list";
}

export default function RepoCard({ repo, viewMode = "grid" }: RepoCardProps) {
  const router = useRouter();

  const handleAnalyze = () => {
    // One-step: navigate directly to explore page with clone_url
    router.push(`/explore?url=${encodeURIComponent(repo.clone_url)}`);
  };

  if (viewMode === "list") {
    return (
      <div className="surface-card p-4 flex items-center justify-between gap-4 group"
           style={{ borderRadius: "var(--radius-md)" }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-md flex items-center justify-center"
               style={{ background: "var(--ink-gold-dim)", border: "1px solid rgba(226, 192, 68, 0.15)", flexShrink: 0 }}>
            <FileCode className="w-4 h-4" style={{ color: "var(--ink-gold)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ color: "var(--ink-white)", fontWeight: 600, fontSize: "0.875rem" }}
                    className="truncate">
                {repo.full_name}
              </span>
              {repo.private ? (
                <Lock className="w-3 h-3" style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              ) : (
                <Globe className="w-3 h-3" style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              )}
            </div>
            {repo.description && (
              <p className="truncate" style={{ color: "var(--ink-dim)", fontSize: "0.8125rem" }}>
                {repo.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {repo.language && (
            <span className="text-code" style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>
              {repo.language}
            </span>
          )}
          <button onClick={handleAnalyze} className="btn btn-primary"
                  style={{ padding: "7px 16px", fontSize: "0.75rem" }}>
            Analyze
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 flex flex-col group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-md flex items-center justify-center"
             style={{ background: "var(--ink-gold-dim)", border: "1px solid rgba(226, 192, 68, 0.15)" }}>
          <FileCode className="w-5 h-5" style={{ color: "var(--ink-gold)" }} />
        </div>
        {repo.private ? (
          <Lock className="w-3.5 h-3.5" style={{ color: "var(--ink-dim)" }} />
        ) : (
          <Globe className="w-3.5 h-3.5" style={{ color: "var(--ink-dim)" }} />
        )}
      </div>

      {/* Name */}
      <h3 className="mb-1.5 truncate" style={{
        color: "var(--ink-white)",
        fontWeight: 600,
        fontSize: "1rem",
        transition: "color 200ms var(--ease-out)",
      }}>
        {repo.name}
      </h3>

      {/* Description */}
      {repo.description ? (
        <p className="mb-4 line-clamp-2" style={{
          color: "var(--ink-dim)",
          fontSize: "0.8125rem",
          lineHeight: "1.5",
          minHeight: "2.5em",
        }}>
          {repo.description}
        </p>
      ) : (
        <div style={{ minHeight: "2.5em", marginBottom: "16px" }} />
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 mb-5">
        {repo.language && (
          <span className="text-code" style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>
            {repo.language}
          </span>
        )}
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" style={{ color: "var(--ink-dim)" }} />
          <span className="text-code" style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>
            {repo.default_branch || "main"}
          </span>
        </div>
      </div>

      {/* Action — one step, no import needed */}
      <button onClick={handleAnalyze}
              className="btn btn-primary w-full"
              style={{ marginTop: "auto" }}>
        Analyze
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
