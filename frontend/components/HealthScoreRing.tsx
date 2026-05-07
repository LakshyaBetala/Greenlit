"use client";

interface HealthScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function HealthScoreRing({ score, size = "md", showLabel = true }: HealthScoreRingProps) {
  const dimensions = { sm: 36, md: 64, lg: 120 };
  const s = dimensions[size];
  const strokeWidth = size === "lg" ? 6 : size === "md" ? 4 : 3;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const getColorClass = () => {
    if (score >= 76) return "excellent";
    if (score >= 51) return "good";
    if (score >= 26) return "warning";
    return "critical";
  };

  const getColor = () => {
    if (score >= 76) return "#10b981";
    if (score >= 51) return "#22c55e";
    if (score >= 26) return "#f59e0b";
    return "#ef4444";
  };

  const fontSize = size === "lg" ? "1.75rem" : size === "md" ? "0.9375rem" : "0.625rem";
  const subSize = size === "lg" ? "0.6875rem" : "0";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: s, height: s }}>
      <svg className="health-ring" width={s} height={s}>
        <circle
          className="health-ring-bg"
          cx={s / 2}
          cy={s / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`health-ring-fill ${getColorClass()}`}
          cx={s / 2}
          cy={s / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "none" }}>
          <span
            className="font-display counter-value"
            style={{ fontSize, color: getColor(), lineHeight: 1 }}
          >
            {score}
          </span>
          {size === "lg" && (
            <span style={{ fontSize: subSize, color: "var(--ink-dim)", marginTop: "2px" }}>
              / 100
            </span>
          )}
        </div>
      )}
    </div>
  );
}
