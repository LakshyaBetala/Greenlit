"use client";

/**
 * AiSidekick — chat panel for asking questions about a scan report.
 *
 * Hits POST /api/repos/chat with { question, report }. Backend routes
 * through chat_service (Gemini Flash, falls back gracefully if no key).
 *
 * Rotating sample questions seed the empty state. Conversation stays in
 * local component state — no persistence (intentional, per privacy
 * stance: we don't log scan-level chat).
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Props {
  scanId: string;
  report: Record<string, unknown>;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

const SAMPLE_QUESTIONS = [
  "Is my login flow secure?",
  "Can someone read my users table without logging in?",
  "What's the biggest risk I should fix this week?",
  "Explain this app like I'm a non-technical founder.",
  "Are my Stripe webhooks safe?",
  "Where am I leaking secrets?",
];

export default function AiSidekick({ scanId, report }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, pending]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setDraft("");
    setPending(true);
    try {
      const res = await fetch(`${API_BASE}/api/repos/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, report, scan_id: scanId }),
      });
      const data = await res.json();
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            data?.answer ||
            "I couldn't get an answer. The Gemini fallback may be rate-limited. Try again in a minute.",
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Network error reaching the Sidekick. Check your connection and retry.",
        },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(draft);
    }
  };

  return (
    <section
      aria-label="AI Sidekick"
      style={{
        padding: "1.5rem",
        background: "var(--surface-alt)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-tertiary)",
            fontWeight: 600,
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkles size={11} />
          AI Sidekick
        </h2>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
          }}
        >
          Chat with your report
        </span>
      </header>

      {/* Conversation */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: 360,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          paddingBottom: "0.25rem",
        }}
      >
        {turns.length === 0 && (
          <div style={{ padding: "0.5rem 0" }}>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                marginTop: 0,
                marginBottom: "0.75rem",
              }}
            >
              Ask anything about this scan. The Sidekick uses your report — not your source.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  style={{
                    padding: "5px 11px",
                    fontSize: "0.74rem",
                    background: "var(--surface-main)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 999,
                    cursor: "pointer",
                    transition: "color 0.12s, border-color 0.12s, background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.background = "var(--surface-main)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            style={{
              alignSelf: t.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "0.625rem 0.875rem",
              background:
                t.role === "user" ? "var(--green-dim)" : "var(--surface-main)",
              border:
                t.role === "user"
                  ? "1px solid var(--green-border)"
                  : "1px solid var(--border-subtle)",
              borderRadius: 10,
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            {t.text}
          </div>
        ))}

        {pending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "0.5rem 0.875rem",
              background: "var(--surface-main)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              fontSize: "0.825rem",
              color: "var(--text-tertiary)",
            }}
            className="loading-dot"
          >
            Sidekick is thinking
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        style={{
          marginTop: "0.875rem",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything about this scan..."
          style={{
            flex: 1,
            resize: "none",
            background: "var(--surface-main)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "0.55rem 0.75rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.12s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="btn btn-green"
          aria-label="Send question"
          style={{
            padding: "0.55rem 0.75rem",
            opacity: pending || !draft.trim() ? 0.5 : 1,
          }}
        >
          <Send size={13} />
        </button>
      </form>
    </section>
  );
}
