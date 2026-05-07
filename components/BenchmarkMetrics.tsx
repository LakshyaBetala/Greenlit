"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Users } from "lucide-react";

interface BenchmarkMetricsProps {
  repoId: string;
}

export default function BenchmarkMetrics({ repoId }: BenchmarkMetricsProps) {
  const [data, setData] = useState<{ percentile: number | null; total_apps: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBenchmark() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/repos/${repoId}/benchmark`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch benchmark", e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBenchmark();
  }, [repoId]);

  if (loading || !data || data.percentile === null) return null;

  return (
    <div className="surface-card p-5 border-l-4 animate-fade" style={{ borderLeftColor: "var(--almmatix-red)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline text-xl flex items-center gap-2 mb-1" style={{ color: "var(--text-primary)" }}>
            <Trophy className="w-5 h-5" style={{ color: "var(--almmatix-red)" }} />
            Top {data.percentile}% Globally
          </h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            This repository ranks in the top {data.percentile}% of all {data.total_apps} apps tracked by Almmatix for code security and health.
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-6 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          <div className="flex flex-col items-center">
            <TrendingUp className="w-4 h-4 mb-1" style={{ color: "var(--status-success)" }} />
            <span>Health</span>
          </div>
          <div className="flex flex-col items-center">
            <Users className="w-4 h-4 mb-1" style={{ color: "var(--text-secondary)" }} />
            <span>{data.total_apps} Apps</span>
          </div>
        </div>
      </div>
    </div>
  );
}
