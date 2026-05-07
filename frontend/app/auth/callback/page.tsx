"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthCallback from "@/components/AuthCallback";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("access_token");
    const error = searchParams.get("error");

    if (error) {
      console.error("Auth error:", error);
      setStatus("error");
      setTimeout(() => router.push("/"), 3000);
      return;
    }

    if (!token) {
      setStatus("error");
      setTimeout(() => router.push("/"), 3000);
      return;
    }

    localStorage.setItem("github_token", token);

    // Fetch GitHub user info + Greenlit plan in parallel
    const fetchUserData = async () => {
      try {
        const ghRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        });
        if (!ghRes.ok) throw new Error("GitHub user fetch failed");
        const ghUser = await ghRes.json();

        // Upsert user in backend and get their Greenlit profile (including plan)
        let greenlitUser: { id?: string; plan?: string } = {};
        try {
          const glRes = await fetch(`${API_BASE}/api/repos/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // The response may contain user info from the auth layer
          if (glRes.ok) {
            const glData = await glRes.json();
            if (glData.user) greenlitUser = glData.user;
          }
        } catch {}

        // Try to get plan separately if we have a user id
        let plan = "free";
        if (greenlitUser.id) {
          try {
            const planRes = await fetch(`${API_BASE}/api/payments/plan?user_id=${greenlitUser.id}`);
            if (planRes.ok) { const pd = await planRes.json(); plan = pd.plan || "free"; }
          } catch {}
        }

        // Store user in localStorage for client-side use
        localStorage.setItem("gh_user", JSON.stringify({
          id: greenlitUser.id || String(ghUser.id),
          login: ghUser.login,
          name: ghUser.name,
          avatar_url: ghUser.avatar_url,
          email: ghUser.email,
          plan,
        }));

        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (err) {
        console.error("Post-auth setup failed:", err);
        // Still succeed — plan defaults to free, user can continue
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    };

    fetchUserData();
  }, [searchParams, router]);

  return (
    <AuthCallback
      onComplete={() => router.push("/dashboard")}
      status={status}
    />
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-main)" }}>
        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--green)", animation: "pulse-green 1.2s ease-in-out infinite" }} />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
