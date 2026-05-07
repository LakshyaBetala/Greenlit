/* ═══════════════════════════════════════════════
   Greenlit — TypeScript Interfaces
   ═══════════════════════════════════════════════ */

// ── GitHub Types ──────────────────────────────

export interface Repository {
  name: string;
  full_name: string;
  private: boolean;
  clone_url: string;
  default_branch: string;
  language?: string;
  description?: string;
  updated_at?: string;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

// ── Analysis Report Types ─────────────────────

export interface TechStackItem {
  name: string;
  category: string;
  files_using: string[];
  purpose: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  label?: string;
}

export interface Architecture {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  mermaid_code?: string;
}

export interface ConnectionItem {
  from: string;
  to: string;
  method: string;
  description: string;
}

export interface DataFlowStep {
  step: number;
  action: string;
  component: string;
  description: string;
}

export interface DataFlow {
  title: string;
  steps: DataFlowStep[];
}

export interface Vulnerability {
  title: string;
  file: string;
  line?: number;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  fix_suggestion?: string;
}

export interface BrokenLink {
  file: string;
  import_path: string;
  issue: string;
  suggestion: string;
}

export interface Improvement {
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
  description: string;
  effort: string;
}

export interface AnalysisReport {
  scan_id?: string;
  repo_id?: string;
  autofix_pr_url?: string | null;
  health_score: number;
  tech_stack: TechStackItem[];
  architecture: Architecture;
  connections: ConnectionItem[];
  data_flow: DataFlow[];
  simple_explanation: string;
  advanced_explanation: string;
  vulnerabilities: Vulnerability[];
  broken_links: BrokenLink[];
  improvements: Improvement[];
  platform_detected?: string | null;
}

// ── Monitoring Types ──────────────────────────

export interface MonitoredRepo {
  id: string;
  github_url: string;
  name: string;
  full_name: string;
  is_monitoring: number; // SQLite uses 0/1
  last_scan_at: string | null;
  production_url?: string | null;
  last_uptime_status?: string | null;
  created_at: string;
  latest_scan?: {
    id: string;
    health_score: number;
    vulnerabilities_count: number;
    critical_count: number;
    status: string;
    created_at: string;
  } | null;
}

export interface ScanHistoryItem {
  id: string;
  health_score: number;
  vulnerabilities_count: number;
  critical_count: number;
  commit_sha: string | null;
  scan_type: "full" | "diff";
  status: string;
  created_at: string;
  autofix_pr_url?: string | null;
  changelog_summary?: string | null;
}

export interface PlatformStats {
  total_scans: number;
  total_repos: number;
  total_vulnerabilities: number;
  total_criticals: number;
  avg_health_score: number | null;
  pct_repos_with_criticals: number;
}

export type UserPlan = "free" | "starter" | "builder";

// ── UI State Types ────────────────────────────

export type ViewMode = "grid" | "list";
export type ExplainMode = "simple" | "advanced";

export type AnalysisTab =
  | "architecture"
  | "tech-stack"
  | "connections"
  | "data-flow"
  | "explained"
  | "vulnerabilities"
  | "broken-links"
  | "improvements"
  | "timeline"
  | "probe"
  | "deploy";

// ── DAST Probe Types ──────────────────────────

export interface DastCheckResult {
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  passed: boolean;
  description: string;
  proof_request: string;
  proof_response: string;
  fix: string;
  category: string;
}

export interface DastProbeResult {
  url: string;
  duration_seconds: number;
  total_checks: number;
  issues_found: number;
  runtime_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  results: DastCheckResult[];
  summary: string;
}

export interface ProbeJob {
  status: "queued" | "scanning" | "complete" | "error";
  url: string;
  result?: DastProbeResult;
  error?: string;
}

export interface CloneStatus {
  status: "idle" | "cloning" | "done" | "error";
  message?: string;
}

export interface JobStatus {
  status: "processing" | "complete" | "error";
  result?: AnalysisReport;
  error?: string;
}
