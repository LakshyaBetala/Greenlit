import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
           style={{ background: "var(--ink-subtle)", border: "1px solid var(--ink-muted)" }}>
        <Icon className="w-6 h-6" style={{ color: "var(--ink-dim)" }} />
      </div>
      <h3 className="text-headline mb-2" style={{ fontSize: "1.125rem" }}>
        {title}
      </h3>
      <p className="mb-6 text-center max-w-sm" style={{ color: "var(--ink-mid)", fontSize: "0.875rem" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-secondary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
