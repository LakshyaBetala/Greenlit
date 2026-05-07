"use client";

import { ScanHistoryItem } from "@/types";
import { GitCommit, ShieldAlert, CheckCircle2, GitBranch } from "lucide-react";

interface ActivityTimelineProps {
  history: ScanHistoryItem[];
}

export default function ActivityTimeline({ history }: ActivityTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
        No activity recorded yet. Keep building!
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative pl-6 py-4">
      {/* The vertical line */}
      <div
        style={{ position: "absolute", top: 0, bottom: 0, left: "27px", width: "1px", background: "var(--border-subtle)" }}
      />

      <div className="flex flex-col gap-8 relative">
        {sortedHistory.map((item, index) => {
          const isCritical = item.critical_count > 0;
          const isDiff = item.scan_type === "diff";
          const Icon = isCritical ? ShieldAlert : isDiff ? GitCommit : GitBranch;
          
          return (
            <div key={item.id} className="relative">
              {/* Timeline Node */}
              <div
                className="absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center z-10"
                style={{
                  background: "var(--surface-elevated)",
                  border: `2px solid ${isCritical ? "var(--status-error)" : "var(--border-strong)"}`,
                  color: isCritical ? "var(--status-error)" : "var(--text-secondary)",
                }}
              >
                <Icon className="w-3 h-3" />
              </div>

              {/* Content */}
              <div className="pl-6">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-headline" style={{ fontSize: "1rem" }}>
                      {isDiff ? "Update Scanned" : "Initial Full Scan"}
                    </span>
                    {item.commit_sha && (
                      <span className="text-code" style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "4px", padding: "1px 6px", fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                        {item.commit_sha.substring(0, 7)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="surface-card p-4 mt-2 shadow-sm">
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {item.changelog_summary || (isDiff ? "Minor code adjustments detected." : "Repository baseline established and analyzed.")}
                  </p>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                    <div className="flex items-center gap-1.5" style={{ fontSize: "0.75rem" }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--status-success)" }} />
                      <span style={{ color: "var(--text-secondary)" }}>Score:</span>
                      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.health_score}</span>
                    </div>
                    
                    {item.vulnerabilities_count > 0 && (
                      <div className="flex items-center gap-1.5" style={{ fontSize: "0.75rem" }}>
                        <ShieldAlert className="w-4 h-4" style={{ color: "var(--status-error)" }} />
                        <span style={{ color: "var(--text-secondary)" }}>Found:</span>
                        <span style={{ color: "var(--status-error)", fontWeight: 600 }}>{item.vulnerabilities_count} issues</span>
                      </div>
                    )}
                    
                    {item.autofix_pr_url && (
                      <div className="flex items-center gap-1.5 ml-auto" style={{ fontSize: "0.75rem" }}>
                        <a href={item.autofix_pr_url} target="_blank" rel="noreferrer" 
                           className="font-medium hover:underline"
                           style={{ color: "var(--almmatix-red)" }}>
                          View Auto-Fix PR
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
