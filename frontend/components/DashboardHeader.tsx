"use client";

import { Shield, LogOut, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface DashboardHeaderProps {
  username?: string;
  avatarUrl?: string;
  plan?: string;
  loading?: boolean;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  builder: "Builder",
};

const PLAN_COLOR: Record<string, string> = {
  free: "var(--text-tertiary)",
  starter: "#3b82f6",
  builder: "var(--green)",
};

export default function DashboardHeader({ username, avatarUrl, plan = "free", loading }: DashboardHeaderProps) {
  const router = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("gh_user");
    router.push("/");
  };

  const planColor = PLAN_COLOR[plan] || PLAN_COLOR.free;
  const planLabel = PLAN_LABEL[plan] || "Free";

  return (
    <header
      style={{
        background: "var(--surface-main)",
        borderBottom: "1px solid var(--border-subtle)",
        height: "var(--nav-height)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "var(--green-dim)",
                border: "1px solid var(--green-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={13} color="var(--green)" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              greenlit
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.1rem" }}>
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/explore", label: "Scan" },
              { href: "/guide", label: "Guide" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 500,
                  transition: "color 0.15s",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: plan + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!loading && (
            <>
              {/* Plan badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: `${planColor}18`,
                  border: `1px solid ${planColor}40`,
                  borderRadius: "999px",
                  padding: "3px 10px",
                }}
              >
                <Zap size={10} color={planColor} strokeWidth={2.5} />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: planColor, letterSpacing: "0.04em" }}>
                  {planLabel.toUpperCase()}
                </span>
              </div>

              {plan === "free" && (
                <Link
                  href="/pricing"
                  className="btn btn-green"
                  style={{ padding: "5px 12px", fontSize: "0.75rem" }}
                >
                  Upgrade
                </Link>
              )}
            </>
          )}

          {loading ? (
            <div style={{ width: "80px", height: "20px", background: "var(--surface-elevated)", borderRadius: "4px" }} />
          ) : username ? (
            <>
              {avatarUrl && (
                <Image
                  src={avatarUrl}
                  alt={username}
                  width={24}
                  height={24}
                  style={{ borderRadius: "50%", border: "1px solid var(--border-strong)" }}
                />
              )}
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {username}
              </span>
              <button
                onClick={handleSignOut}
                className="btn btn-ghost"
                style={{ padding: "6px 8px" }}
                title="Sign out"
              >
                <LogOut size={13} color="var(--text-secondary)" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
