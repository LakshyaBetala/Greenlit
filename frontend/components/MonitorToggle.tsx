"use client";

interface MonitorToggleProps {
  active: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export default function MonitorToggle({ active, onToggle, loading = false }: MonitorToggleProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={loading}
      className="flex items-center gap-2 transition-colors"
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        background: active ? "var(--ink-emerald-dim)" : "var(--ink-subtle)",
        border: `1px solid ${active ? "rgba(16, 185, 129, 0.2)" : "var(--ink-muted)"}`,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
      id="monitor-toggle"
    >
      <div className={`monitor-dot ${active ? "active" : "inactive"}`} />
      <span style={{
        fontSize: "0.6875rem",
        fontWeight: 500,
        color: active ? "var(--ink-emerald)" : "var(--ink-dim)",
      }}>
        {active ? "Monitoring" : "Monitor"}
      </span>
    </button>
  );
}
