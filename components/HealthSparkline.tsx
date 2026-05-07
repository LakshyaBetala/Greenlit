"use client";

interface HealthSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function HealthSparkline({
  data,
  width = 120,
  height = 32,
  color,
}: HealthSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "0.625rem", color: "var(--ink-dim)" }}>No data</span>
      </div>
    );
  }

  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * w,
    y: padding + h - ((val - min) / range) * h,
    value: val,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  // Determine color from last value trend
  const lastVal = data[data.length - 1];
  const strokeColor = color || (
    lastVal >= 76 ? "#10b981" :
    lastVal >= 51 ? "#22c55e" :
    lastVal >= 26 ? "#f59e0b" :
    "#ef4444"
  );

  return (
    <div className="sparkline-container" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Area fill */}
        <path
          d={areaPath}
          className="sparkline-area"
          fill={strokeColor}
        />
        {/* Line */}
        <path
          d={linePath}
          className="sparkline-line"
          stroke={strokeColor}
        />
        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            className="sparkline-dot"
            fill={strokeColor}
            r={2.5}
          >
            <title>{p.value}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
