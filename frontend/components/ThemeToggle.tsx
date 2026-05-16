"use client";

/**
 * ThemeToggle — small icon button in the navbar.
 *
 * Shows Sun in dark mode (click → light), Moon in light mode (click → dark).
 * Uses MutationObserver via ThemeProvider so it stays in sync if the theme
 * is changed from elsewhere (e.g. another tab).
 */

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: "32px",
        height: "32px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: "7px",
        cursor: "pointer",
        color: "var(--text-secondary)",
        transition: "color 0.15s ease, border-color 0.15s ease, background 0.12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text-primary)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {isDark ? (
        <Sun size={14} strokeWidth={2} />
      ) : (
        <Moon size={14} strokeWidth={2} />
      )}
    </button>
  );
}
