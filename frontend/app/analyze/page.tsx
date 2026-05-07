"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy analyze page — redirects to /explore with the repo URL.
 * Kept for backward compatibility with existing links.
 */
function AnalyzeRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoName = searchParams.get("repo") || "";

  useEffect(() => {
    if (repoName) {
      // Convert repo name to full GitHub URL if it's just owner/repo
      const githubUrl = repoName.startsWith("http")
        ? repoName
        : `https://github.com/${repoName}`;
      router.replace(`/explore?url=${encodeURIComponent(githubUrl)}`);
    } else {
      router.replace("/");
    }
  }, [repoName, router]);

  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: "var(--ink-black)" }}>
      <div className="w-3 h-3 rounded-full loading-dot"
           style={{ background: "var(--ink-gold)" }} />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: "var(--ink-black)" }}>
        <div className="w-3 h-3 rounded-full loading-dot"
             style={{ background: "var(--ink-gold)" }} />
      </div>
    }>
      <AnalyzeRedirect />
    </Suspense>
  );
}
