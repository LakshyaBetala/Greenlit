import { Shield } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--surface-main)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "5px",
                background: "var(--green-dim)",
                border: "1px solid var(--green-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={11} color="var(--green)" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "var(--text-secondary)",
              }}
            >
              greenlit
            </span>
          </Link>

          {/* Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-tertiary)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              GitHub
            </a>
            <Link
              href="/#pricing"
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-tertiary)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              Pricing
            </Link>
          </div>

          {/* Copyright */}
          <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0 }}>
            &copy; {new Date().getFullYear()} Greenlit. Built for vibe coders.
          </p>
        </div>
      </div>
    </footer>
  );
}
