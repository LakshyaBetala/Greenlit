"use client";

import { MonitoredRepo } from "@/types";
import HealthScoreRing from "./HealthScoreRing";
import HealthSparkline from "./HealthSparkline";
import MonitorToggle from "./MonitorToggle";
import { Clock, AlertTriangle, Scan, ExternalLink, Zap, Share2 } from "lucide-react";

interface MonitoredRepoCardProps {
  repo: MonitoredRepo;
  history?: number[];
  onToggleMonitor: (repoId: string, enabled: boolean) => void;
  onScanNow: (repoId: string) => void;
  onViewReport: (repoId: string) => void;
  onShare?: (repoId: string, scanId: string, repoName: string) => void;
  scanLoading?: boolean;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MonitoredRepoCard({
  repo,
  history = [],
  onToggleMonitor,
  onScanNow,
  onViewReport,
  onShare,
  scanLoading = false,
}: MonitoredRepoCardProps) {
  const score = repo.latest_scan?.health_score ?? null;
  const vulns = repo.latest_scan?.vulnerabilities_count ?? 0;
  const criticals = repo.latest_scan?.critical_count ?? 0;
  const hasReport = repo.latest_scan?.status === "complete";
  const hasWebhook = !!(repo as unknown as Record<string, unknown>).webhook_id;

  const isUp = repo.last_uptime_status?.startsWith("up");
  const _isDown = repo.last_uptime_status?.startsWith("down"); void _isDown;

  return (
    <div
      className="surface-card p-5 group cursor-pointer"
      onClick={() => hasReport && onViewReport(repo.id)}
    >
      {/* Top Row: Score + Name + Monitor Toggle */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          {/* Health Score Ring */}
          {score !== null ? (
            <HealthScoreRing score={score} size="sm" />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "0px",
                background: "var(--ink-deep)",
                border: "1px solid var(--ink-muted)",
              }}
            >
              <span style={{ fontSize: "0.625rem", color: "var(--ink-dim)" }}>—</span>
            </div>
          )}

          {/* Repo Name */}
          <div>
            <h3 className="text-headline" style={{ fontSize: "1rem" }}>
              {repo.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-code" style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                {repo.full_name}
              </p>
              {repo.production_url && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm"
                      style={{ 
                        background: isUp ? "var(--status-success)" : "var(--status-error)",
                        color: "white" 
                      }}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-white ${isUp ? 'animate-pulse' : ''}`} />
                  {isUp ? "LIVE" : "DOWN"}
                </span>
              )}
            </div>
          </div>
        </div>

        <MonitorToggle
          active={!!repo.is_monitoring}
          onToggle={() => onToggleMonitor(repo.id, !repo.is_monitoring)}
        />
      </div>

      {/* Middle: Sparkline + Vulnerability Count */}
      <div className="flex items-center justify-between mb-4">
        <HealthSparkline data={history} width={100} height={28} />

        {vulns > 0 ? (
          <div className="flex items-center gap-1.5">
            <AlertTriangle
              className="w-3.5 h-3.5"
              style={{ color: criticals > 0 ? "var(--status-error)" : "var(--status-warning)" }}
            />
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: criticals > 0 ? "var(--status-error)" : "var(--status-warning)",
            }}>
              {vulns} issue{vulns !== 1 ? "s" : ""}
            </span>
          </div>
        ) : hasReport ? (
          <span style={{ fontSize: "0.75rem", color: "var(--status-success)" }}>
            ✓ Clean
          </span>
        ) : null}
      </div>

      {/* Bottom: Last Scan + Webhook Status + Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", marginTop: "0.5rem" }}>
        <div className="flex items-center gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock style={{ width: "12px", height: "12px", color: "var(--text-tertiary)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
              {timeAgo(repo.last_scan_at)}
            </span>
          </div>
          {hasWebhook && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                 style={{ color: "var(--status-success)", background: "rgba(42, 157, 143, 0.1)" }}>
              <Zap className="w-2.5 h-2.5" />
              Auto
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onScanNow(repo.id); }}
            disabled={scanLoading}
            className="btn btn-outline"
            style={{ fontSize: "0.75rem", padding: "4px 12px", gap: "6px", borderRadius: "4px" }}
          >
            <Scan className={`w-3.5 h-3.5 ${scanLoading ? "animate-spin" : ""}`} />
            Scan
          </button>

          {hasReport && (
            <>
              {onShare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onShare(repo.id, repo.latest_scan!.id, repo.name); }}
                  className="btn btn-outline"
                  style={{ fontSize: "0.75rem", padding: "4px 12px", gap: "6px", borderRadius: "4px" }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onViewReport(repo.id); }}
                className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "4px 12px", gap: "6px", borderRadius: "4px" }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
