import { Metadata } from "next";
import ReportClient from "./ReportClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Props {
  params: Promise<{ scanId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scanId } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/public/report/${scanId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("not found");

    const data = await res.json();
    const score = data.health_score ?? 0;
    const vulnCount = data.vulnerabilities_count ?? 0;
    const explanation: string = data.report?.simple_explanation ?? "";
    const repoName: string = data.repo_name ?? scanId;

    const title = `Health Score: ${score}/100 — ${repoName} | Greenlit`;
    const description = explanation
      ? explanation.slice(0, 155)
      : `${vulnCount} security issue${vulnCount !== 1 ? "s" : ""} found. View the full safety report on Greenlit.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Greenlit",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Security Report | Greenlit",
      description: "View this public security report on Greenlit.",
    };
  }
}

export default function PublicReportPage() {
  return <ReportClient />;
}
