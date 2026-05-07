"use client";

import React, { useEffect, useState } from "react";
import { Github, CheckCircle2, Terminal, ArrowRight, XCircle } from "lucide-react";

interface AuthCallbackProps {
  onComplete: () => void;
  status?: "loading" | "success" | "error";
}

const PROTOCOL_LOGS = [
  "POST /auth/github/callback HTTP/1.1",
  "Handshaking with api.github.com...",
  "Retrieving OAuth v2 scope authorization...",
  "Identity verified",
  "Mapping repository access...",
  "Session established.",
];

const ERROR_LOGS = [
  "POST /auth/github/callback HTTP/1.1",
  "ERROR: Authorization failed",
  "Redirecting...",
];

const AuthCallback: React.FC<AuthCallbackProps> = ({ onComplete, status = "loading" }) => {
  const [animStep, setAnimStep] = useState(0);

  // Derive displayed logs from status + animation step — no setState in effect
  const currentLogs = status === "error" ? ERROR_LOGS : PROTOCOL_LOGS.slice(0, animStep);
  const isAnimComplete = status === "error" || animStep >= PROTOCOL_LOGS.length;

  useEffect(() => {
    if (isAnimComplete) return;
    const timer = setTimeout(
      () => setAnimStep((prev) => prev + 1),
      350 + Math.random() * 500,
    );
    return () => clearTimeout(timer);
  }, [animStep, isAnimComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "var(--ink-black)" }}>
      <div className="max-w-lg w-full surface-card p-8 md:p-10 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 right-0 p-4" style={{ opacity: 0.05 }}>
          <Github className="w-24 h-24" style={{ color: "var(--ink-gold)" }} />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-md flex items-center justify-center"
                 style={{
                   background: status === "error" ? "var(--ink-rose-dim)" : "var(--ink-gold-dim)",
                   border: `1px solid ${status === "error" ? "rgba(244, 63, 94, 0.2)" : "rgba(226, 192, 68, 0.2)"}`,
                 }}>
              {status === "error" ? (
                <XCircle className="w-5 h-5" style={{ color: "var(--ink-rose)" }} />
              ) : !isAnimComplete ? (
                <div className="w-2.5 h-2.5 rounded-full loading-dot"
                     style={{ background: "var(--ink-gold)" }} />
              ) : (
                <CheckCircle2 className="w-5 h-5" style={{ color: "var(--ink-emerald)" }} />
              )}
            </div>
            <div>
              <h2 className="text-headline" style={{ fontSize: "1.125rem" }}>
                {status === "error"
                  ? "Authorization Failed"
                  : !isAnimComplete
                    ? "Authorizing..."
                    : "Authorized"}
              </h2>
              <p className="text-code" style={{ fontSize: "0.6875rem", color: "var(--ink-dim)" }}>
                GitHub OAuth 2.0
              </p>
            </div>
          </div>

          {/* Terminal */}
          <div className="surface-inset p-5 font-mono text-xs mb-6 overflow-y-auto"
               style={{ height: "180px" }}>
            <div className="flex items-center gap-2 mb-3"
                 style={{ color: "var(--ink-dim)", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <Terminal className="w-3 h-3" />
              auth_log
            </div>
            <div className="space-y-1.5">
              {currentLogs.map((log, i) => (
                <div key={i} className="flex gap-2"
                     style={{
                       color: log.includes("ERROR")
                         ? "var(--ink-rose)"
                         : log.includes("verified") || log.includes("established")
                           ? "var(--ink-emerald)"
                           : "var(--ink-mid)",
                     }}>
                  <span style={{ color: "var(--ink-dim)" }}>
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  <span>{log}</span>
                </div>
              ))}
              {!isAnimComplete && (
                <div className="w-1.5 h-3.5 inline-block ml-1"
                     style={{ background: "var(--ink-gold)", animation: "pulse-dot 1s infinite" }} />
              )}
            </div>
          </div>

          {/* Complete state */}
          {isAnimComplete && status === "success" && (
            <div className="animate-in">
              <button onClick={onComplete}
                      className="btn btn-primary w-full"
                      style={{ padding: "12px 24px" }}>
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
