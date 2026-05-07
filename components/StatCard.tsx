"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = "var(--text-primary)",
  iconBg = "rgba(0,0,0,0.05)",
}: StatCardProps) {
  return (
    <div className="surface-card p-5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <div
          className="text-headline"
          style={{ fontSize: "1.5rem", lineHeight: 1.1 }}
        >
          {value}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px", fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
