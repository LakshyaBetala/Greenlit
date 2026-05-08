"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Lightbulb, Copy, Github, BookOpen, Layers, Terminal, Check } from "lucide-react";

export default function IdeaToAppPage() {
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [loading, setLoading] = useState(false);
  type IdeaResult = {
    mega_prompt?: string;
    architecture?: string;
    tech_stack?: string[];
    features?: string[];
    github_guide?: { step: string; detail: string; description?: string }[];
  };
  const [result, setResult] = useState<IdeaResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/idea/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, mode })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate blueprint.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (result?.mega_prompt) {
      navigator.clipboard.writeText(result.mega_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const S = {
    page: { minHeight: "100vh", background: "var(--surface-main)", display: "flex", flexDirection: "column" as const },
    card: { background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px" },
    modeToggle: {
      display: "flex", alignItems: "center", gap: "2px",
      background: "var(--surface-main)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "3px",
    },
    modeBtn: (active: boolean): React.CSSProperties => ({
      padding: "5px 16px", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 500,
      border: "none", cursor: "pointer", transition: "all 0.15s",
      background: active ? "var(--surface-elevated)" : "transparent",
      color: active ? "var(--text-primary)" : "var(--text-secondary)",
    }),
    tagChip: {
      background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)",
      borderRadius: "999px", padding: "4px 12px", fontSize: "0.8125rem", fontWeight: 500,
      color: "var(--text-secondary)",
    },
    codeBlock: {
      background: "var(--surface-main)", border: "1px solid var(--border-subtle)",
      borderRadius: "8px", padding: "1rem",
      fontFamily: "var(--font-mono), monospace", fontSize: "0.8125rem",
      lineHeight: 1.6, color: "#d4d4d4", overflowX: "auto" as const,
      whiteSpace: "pre-wrap" as const,
    },
    stepCircle: {
      width: "24px", height: "24px", flexShrink: 0,
      borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.6875rem", fontWeight: 700,
      background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)",
    },
  };

  return (
    <div style={S.page}>
      <Navbar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem", paddingTop: "6rem", maxWidth: "56rem", margin: "0 auto", width: "100%" }}>
        {!result ? (
          <div style={{ width: "100%", maxWidth: "40rem", textAlign: "center" }} className="animate-in">
            <Lightbulb style={{ width: "48px", height: "48px", margin: "0 auto 1.5rem", color: "var(--green)" }} />
            <h1 className="text-headline" style={{ fontSize: "3rem", lineHeight: 1.1, marginBottom: "1rem" }}>
              Idea to App Blueprint
            </h1>
            <p style={{ marginBottom: "2.5rem", fontSize: "1.0625rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Describe your idea in plain English. We&apos;ll generate the perfect tech stack and the exact prompt to paste into Antigravity or Bolt to build it for free.
            </p>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#ef4444" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} style={{ ...S.card, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="I want to build a marketplace for local bakers where people can order custom cakes..."
                style={{
                  width: "100%", background: "transparent", outline: "none", resize: "none",
                  color: "var(--text-primary)", fontSize: "1.0625rem", border: "none",
                  minHeight: "120px", fontFamily: "inherit", lineHeight: 1.6,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={S.modeToggle}>
                  {(["simple", "advanced"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMode(m)} style={S.modeBtn(mode === m)}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>

                <button type="submit" disabled={loading || !idea.trim()} className="btn btn-green">
                  {loading ? (
                    <span className="loading-dot">Thinking</span>
                  ) : (
                    <>Generate Blueprint <ArrowRight style={{ width: "16px", height: "16px", marginLeft: "4px" }} /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ width: "100%" }} className="animate-in">
            <button
              onClick={() => setResult(null)}
              className="btn btn-ghost"
              style={{ marginBottom: "2rem", fontSize: "0.875rem" }}
            >
              ← Back to Idea
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Mega Prompt */}
                  <div style={{ ...S.card, padding: "1.5rem", borderLeft: "3px solid var(--green)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                      <h2 className="text-headline" style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Terminal style={{ width: "20px", height: "20px", color: "var(--green)" }} />
                        The Mega-Prompt
                      </h2>
                      <button onClick={handleCopyPrompt} className="btn btn-outline" style={{ fontSize: "0.8125rem", padding: "6px 12px", gap: "6px" }}>
                        {copied ? (
                          <><Check style={{ width: "14px", height: "14px" }} /> Copied!</>
                        ) : (
                          <><Copy style={{ width: "14px", height: "14px" }} /> Copy Prompt</>
                        )}
                      </button>
                    </div>
                    <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      Paste this exact prompt into <strong style={{ color: "var(--text-primary)" }}>Antigravity</strong>, <strong style={{ color: "var(--text-primary)" }}>Bolt.new</strong>, or <strong style={{ color: "var(--text-primary)" }}>Lovable</strong>. It is engineered to generate a flawless version of your app on the first try.
                    </p>
                    <div style={S.codeBlock}>{result.mega_prompt}</div>
                  </div>

                  {/* Architecture */}
                  <div style={{ ...S.card, padding: "1.5rem" }}>
                    <h2 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <BookOpen style={{ width: "20px", height: "20px", color: "var(--status-info)" }} />
                      How It Works
                    </h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9375rem" }}>
                      {result.architecture}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Tech Stack */}
                  <div style={{ ...S.card, padding: "1.5rem" }}>
                    <h2 className="text-headline" style={{ fontSize: "1.125rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Layers style={{ width: "18px", height: "18px", color: "var(--green)" }} />
                      Tech Stack
                    </h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {(result.tech_stack || []).map((tech, i) => (
                        <span key={i} style={S.tagChip}>{tech}</span>
                      ))}
                    </div>
                  </div>

                  {/* GitHub Guide */}
                  <div style={{ ...S.card, padding: "1.5rem" }}>
                    <h2 className="text-headline" style={{ fontSize: "1.125rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Github style={{ width: "18px", height: "18px" }} />
                      GitHub Guide
                    </h2>
                    <p style={{ fontSize: "0.8125rem", marginBottom: "1rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Once your app is built, follow these steps to secure it and put it online for free.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {(result.github_guide || []).map((guide, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
                          <div style={S.stepCircle}>{i + 1}</div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{guide.step}</p>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px", lineHeight: 1.5 }}>{guide.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
