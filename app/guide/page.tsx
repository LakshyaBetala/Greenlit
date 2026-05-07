"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  Github, GitBranch, Shield, Rocket, BookOpen, ChevronDown, ChevronRight,
  Upload, Lock, ExternalLink,
  Copy, Check,
} from "lucide-react";

const SECTIONS = [
  {
    id: "github-what",
    icon: Github,
    title: "What is GitHub? (and why do you need it)",
    badge: "Start here",
    badgeColor: "var(--green)",
    content: null,
  },
  {
    id: "git-basics",
    icon: GitBranch,
    title: "What is Git? The \"save button\" for code",
    badge: null,
    content: null,
  },
  {
    id: "push-to-github",
    icon: Upload,
    title: "How to put your Lovable / Bolt app on GitHub",
    badge: "Most asked",
    badgeColor: "#fbbf24",
    content: null,
  },
  {
    id: "deploy",
    icon: Rocket,
    title: "How to deploy your app for free (so real users can use it)",
    badge: null,
    content: null,
  },
  {
    id: "security-basics",
    icon: Shield,
    title: "Why does security matter? What could actually go wrong?",
    badge: null,
    content: null,
  },
  {
    id: "env-vars",
    icon: Lock,
    title: "What are environment variables? Where do API keys go?",
    badge: "Critical",
    badgeColor: "var(--status-error)",
    content: null,
  },
];

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(copyText || children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative", marginBottom: "1rem" }}>
      <pre style={{
        background: "var(--surface-main)", border: "1px solid var(--border-subtle)",
        borderRadius: "8px", padding: "1rem 2.5rem 1rem 1rem",
        fontFamily: "var(--font-mono), monospace", fontSize: "0.8125rem",
        lineHeight: 1.6, color: "#d4d4d4", overflowX: "auto", whiteSpace: "pre-wrap",
        wordBreak: "break-all", margin: 0,
      }}>
        {children}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute", top: "8px", right: "8px",
          background: "var(--surface-elevated)", border: "1px solid var(--border-strong)",
          borderRadius: "4px", padding: "3px 8px",
          fontSize: "0.6875rem", color: "var(--text-secondary)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "4px",
        }}
      >
        {copied ? <><Check style={{ width: "10px", height: "10px" }} /> Done</> : <><Copy style={{ width: "10px", height: "10px" }} /> Copy</>}
      </button>
    </div>
  );
}

function Callout({ type, children }: { type: "tip" | "warning" | "danger"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "rgba(34,197,94,0.06)", border: "var(--green-border)", color: "var(--green)", label: "💡 Tip" },
    warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", color: "#fbbf24", label: "⚠ Important" },
    danger: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#f87171", label: "🚨 Critical" },
  };
  const s = styles[type];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.color, display: "block", marginBottom: "4px" }}>{s.label}</span>
      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: string | number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
      <div style={{
        width: "32px", height: "32px", flexShrink: 0, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.875rem", fontWeight: 700,
        background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)",
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "0.9375rem" }}>{title}</p>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

const sectionContent: Record<string, React.ReactNode> = {
  "github-what": (
    <div>
      <p style={{ fontSize: "1rem", lineHeight: 1.8, marginBottom: "1.25rem" }}>
        Imagine GitHub as <strong style={{ color: "var(--text-primary)" }}>Google Drive for code</strong> — but smarter.
      </p>
      <p style={{ lineHeight: 1.8, marginBottom: "1.25rem" }}>
        When you build something with Lovable or Bolt, your code lives on their servers. If Lovable disappears tomorrow, so does your app. GitHub is where you keep your own copy — forever, for free.
      </p>
      <p style={{ lineHeight: 1.8, marginBottom: "1.25rem" }}>
        But GitHub does more than storage:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { icon: "📁", title: "Stores every version of your code", desc: "Every time you save (\"commit\"), GitHub remembers the old version too. Broke something? Roll back in one click." },
          { icon: "🚀", title: "Connects to deployment platforms", desc: "Vercel, Railway, Render — they all connect directly to GitHub. Push code to GitHub → app auto-deploys. No manual uploads." },
          { icon: "🔐", title: "Unlocks security tools", desc: "Greenlit, Snyk, Dependabot — they all work with GitHub. Without a GitHub repo, you can't use any of them." },
          { icon: "👥", title: "Enables collaboration", desc: "If you hire a developer, they need your GitHub repo. No GitHub = no handoff." },
        ].map(item => (
          <div key={item.title} style={{ display: "flex", gap: "0.875rem", background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.875rem" }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{item.icon}</span>
            <div>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.875rem", marginBottom: "2px" }}>{item.title}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Callout type="tip">
        GitHub is free for public repos (everyone can see your code) and free for private repos too (up to 3 collaborators). For a solo founder, you&apos;ll never pay for GitHub.
      </Callout>
      <a href="https://github.com/signup" target="_blank" rel="noreferrer" className="btn btn-green" style={{ display: "inline-flex", marginTop: "0.5rem" }}>
        <Github style={{ width: "14px", height: "14px", marginRight: "6px" }} />
        Create free GitHub account
      </a>
    </div>
  ),

  "git-basics": (
    <div>
      <p style={{ lineHeight: 1.8, marginBottom: "1.25rem" }}>
        Git is the <strong style={{ color: "var(--text-primary)" }}>tool that tracks changes</strong> in your code. Think of it like &quot;Track Changes&quot; in Google Docs, but for code files.
      </p>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Three words you&apos;ll see everywhere:</p>
        {[
          { word: "Commit", plain: "A saved snapshot. \"I saved my work at this point in time.\" Like Ctrl+S but permanent." },
          { word: "Push", plain: "Upload your saved snapshots to GitHub (the online storage). Your code is now backed up and shareable." },
          { word: "Pull", plain: "Download the latest version from GitHub to your computer. Use this when a collaborator made changes." },
        ].map(item => (
          <div key={item.word} style={{ marginBottom: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{
              background: "var(--green-dim)", border: "1px solid var(--green-border)",
              borderRadius: "5px", padding: "1px 8px",
              fontSize: "0.8125rem", fontWeight: 700, color: "var(--green)",
              flexShrink: 0, fontFamily: "var(--font-mono), monospace",
            }}>{item.word}</span>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>{item.plain}</p>
          </div>
        ))}
      </div>
      <Callout type="tip">
        You don&apos;t need to understand Git deeply. Lovable and Bolt have buttons to &quot;export to GitHub&quot; or &quot;push to GitHub&quot; that do all the Git work for you. You just need to know what the words mean.
      </Callout>
    </div>
  ),

  "push-to-github": (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <a href="#lovable" style={{
          background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)",
          borderRadius: "8px", padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
          color: "var(--text-primary)", cursor: "pointer", textDecoration: "none",
        }}>
          From Lovable
        </a>
        <a href="#bolt" style={{
          background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)",
          borderRadius: "8px", padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
          color: "var(--text-primary)", cursor: "pointer", textDecoration: "none",
        }}>
          From Bolt.new
        </a>
        <a href="#cursor" style={{
          background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)",
          borderRadius: "8px", padding: "0.625rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
          color: "var(--text-primary)", cursor: "pointer", textDecoration: "none",
        }}>
          From Cursor/VS Code
        </a>
      </div>

      <div id="lovable" style={{ marginBottom: "2rem" }}>
        <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>From Lovable</h4>
        <Step n="1" title="Click the GitHub button in Lovable">
          In your Lovable project, look for the GitHub icon in the top right corner. Click it.
        </Step>
        <Step n="2" title="Connect your GitHub account">
          If this is your first time, Lovable will ask you to log in to GitHub. Allow the permissions.
        </Step>
        <Step n="3" title="Create a new repository">
          Give it a name (e.g., &quot;my-app&quot;) and click &quot;Create repository&quot;. Your code is now on GitHub.
        </Step>
        <Step n="4" title="Done — find your repo">
          Go to <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "var(--green)" }}>github.com</a> → your profile → repositories. You&apos;ll see it there.
        </Step>
      </div>

      <div id="bolt" style={{ marginBottom: "2rem" }}>
        <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>From Bolt.new</h4>
        <Step n="1" title="Download your code">
          In Bolt, click the download icon (top right) to get a zip file of your project.
        </Step>
        <Step n="2" title="Create a new repo on GitHub">
          Go to <a href="https://github.com/new" target="_blank" rel="noreferrer" style={{ color: "var(--green)" }}>github.com/new</a>. Name your repo. Check &quot;Private&quot;. Click &quot;Create repository&quot;.
        </Step>
        <Step n="3" title="Upload your files">
          In your new repo, click &quot;uploading an existing file&quot;. Drag in all your unzipped files. Scroll down, write &quot;first upload&quot; in the commit message, click &quot;Commit changes&quot;.
        </Step>
        <Callout type="tip">
          Alternatively, install <a href="https://desktop.github.com" target="_blank" rel="noreferrer" style={{ color: "var(--green)" }}>GitHub Desktop</a> — it&apos;s a visual app that makes git easy. No terminal needed.
        </Callout>
      </div>

      <div id="cursor">
        <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>From Cursor / VS Code (terminal method)</h4>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1rem" }}>
          Open the terminal in Cursor (Ctrl+&grave; or Cmd+&grave;) and run these commands one by one:
        </p>
        <CodeBlock>{`git init
git add .
git commit -m "first commit"`}</CodeBlock>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
          Then create a repo on GitHub (github.com/new) and run the &quot;push existing repo&quot; commands it shows you:
        </p>
        <CodeBlock>{`git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main`}</CodeBlock>
      </div>
    </div>
  ),

  "deploy": (
    <div>
      <p style={{ lineHeight: 1.8, marginBottom: "1.5rem" }}>
        Your app lives on Lovable&apos;s or Bolt&apos;s servers right now. That&apos;s fine for building — but for a real product with real users, you want your own hosting. It&apos;s free.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            name: "Vercel",
            best: "Next.js, React, Vite",
            free: "Free forever for hobby projects",
            url: "https://vercel.com",
            rating: 5,
            note: "Best choice for 90% of vibe-coded apps",
          },
          {
            name: "Railway",
            best: "Python, FastAPI, Node, Postgres",
            free: "$5/mo credit included",
            url: "https://railway.app",
            rating: 4,
            note: "Best for full-stack with database",
          },
          {
            name: "Render",
            best: "Node, Python, Docker",
            free: "Free tier (sleeps after 15 min)",
            url: "https://render.com",
            rating: 4,
            note: "Good free tier, slower cold start",
          },
          {
            name: "Netlify",
            best: "React, static sites",
            free: "Free forever, 100GB bandwidth",
            url: "https://netlify.com",
            rating: 4,
            note: "Great for static frontends",
          },
        ].map(p => (
          <a key={p.name} href={p.url} target="_blank" rel="noreferrer" style={{
            background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)",
            borderRadius: "10px", padding: "1.25rem", textDecoration: "none",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{p.name}</span>
              <ExternalLink style={{ width: "12px", height: "12px", color: "var(--text-tertiary)" }} />
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Best for: {p.best}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>{p.free}</div>
            {p.note && <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontStyle: "italic" }}>{p.note}</div>}
          </a>
        ))}
      </div>

      <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.5rem" }}>
        <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "1rem" }}>Deploy to Vercel in 5 minutes (recommended)</h4>
        <Step n="1" title="Push your code to GitHub first">
          Follow the &quot;How to put your app on GitHub&quot; guide above. You need a GitHub repo before you can deploy.
        </Step>
        <Step n="2" title="Go to vercel.com and sign up">
          Click &quot;Sign up&quot; → &quot;Continue with GitHub&quot;. Allow permissions.
        </Step>
        <Step n="3" title="Import your project">
          Click &quot;Add New&quot; → &quot;Project&quot; → find your GitHub repo → click &quot;Import&quot;.
        </Step>
        <Step n="4" title="Add environment variables (if needed)">
          If your app uses API keys (Supabase, OpenAI, etc.), add them here under &quot;Environment Variables&quot; before clicking Deploy. Never put real keys in your code files.
        </Step>
        <Step n="5" title="Click Deploy">
          Vercel builds your app and gives you a URL like <code style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>your-app.vercel.app</code>. Share it with anyone.
        </Step>
        <Callout type="tip">
          Every time you push new code to GitHub, Vercel automatically re-deploys. Set it up once and forget about it.
        </Callout>
      </div>
    </div>
  ),

  "security-basics": (
    <div>
      <p style={{ lineHeight: 1.8, marginBottom: "1.5rem" }}>
        Here&apos;s the honest truth about AI-built apps: <strong style={{ color: "var(--text-primary)" }}>91% have at least one security vulnerability</strong>. Not because AI is bad — because security is hard and AI tools optimize for &quot;it works,&quot; not &quot;it&apos;s secure.&quot;
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          {
            title: "The Supabase key leak",
            severity: "🔴 Critical",
            what: "You build your app, Lovable puts your Supabase service role key directly in your frontend code.",
            whyBad: "Anyone can open your app, view the source code, copy the key, and access your entire database. All user data. All records. Gone.",
            howCommon: "This happens in ~40% of Lovable apps by default.",
          },
          {
            title: "Missing authentication on API routes",
            severity: "🔴 Critical",
            what: "Your API endpoint /api/users returns all user data when called without a login token.",
            whyBad: "Any attacker can call GET /api/users and download your entire user list. Names, emails, everything.",
            howCommon: "Extremely common in vibe-coded apps — AI doesn't add auth guards unless explicitly told to.",
          },
          {
            title: "No rate limiting on login",
            severity: "🟡 High",
            what: "Your /api/login endpoint accepts unlimited password attempts.",
            whyBad: "Bots can try millions of passwords automatically until they get in. Your users' accounts get compromised.",
            howCommon: "Almost universal in AI-built apps.",
          },
        ].map(item => (
          <div key={item.title} style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9375rem" }}>{item.title}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{item.severity}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}><strong style={{ color: "var(--text-primary)" }}>What it is:</strong> {item.what}</p>
            <p style={{ fontSize: "0.875rem", color: "#f87171", marginBottom: "0.5rem" }}><strong>Why it&apos;s dangerous:</strong> {item.whyBad}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>How common: {item.howCommon}</p>
          </div>
        ))}
      </div>

      <Callout type="tip">
        Greenlit finds all of these automatically — just paste your GitHub URL. Free scan takes 60 seconds.
      </Callout>
    </div>
  ),

  "env-vars": (
    <div>
      <Callout type="danger">
        This is the #1 mistake vibe coders make. Read this carefully.
      </Callout>

      <p style={{ lineHeight: 1.8, marginBottom: "1.25rem" }}>
        API keys are like passwords for services you use (Supabase, OpenAI, Stripe, SendGrid). If someone gets your API key, they can:
      </p>
      <ul style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 2, paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
        <li>Drain your Stripe account</li>
        <li>Run $10,000 of OpenAI API calls (billed to you)</li>
        <li>Delete your entire database</li>
        <li>Send spam emails from your account</li>
      </ul>

      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, color: "var(--status-error)", fontSize: "0.9375rem", marginBottom: "0.75rem" }}>❌ NEVER do this (even though AI tools sometimes suggest it):</p>
        <CodeBlock>{`// DO NOT put keys in your code files
const supabase = createClient(
  "https://xxxx.supabase.co",
  "eyJhbGciOiJIUzI1NiJ9..." // ← This is your key. Everyone can see it.
)`}</CodeBlock>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, color: "var(--green)", fontSize: "0.9375rem", marginBottom: "0.75rem" }}>✅ Do this instead — use environment variables:</p>
        <CodeBlock>{`// The key is stored in a secret file, not in your code
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)`}</CodeBlock>
      </div>

      <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.25rem" }}>
        <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "1rem" }}>Setting up .env files</h4>
        <Step n="1" title="Create a .env.local file in your project root">
          This file holds your real secrets. It should never be uploaded to GitHub.
          <CodeBlock>{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here`}</CodeBlock>
        </Step>
        <Step n="2" title="Add .env.local to .gitignore">
          The <code style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>.gitignore</code> file tells GitHub what NOT to upload. Make sure it contains:
          <CodeBlock>{`.env
.env.local
.env.production
.env.development`}</CodeBlock>
        </Step>
        <Step n="3" title="When deploying, add your keys in the platform dashboard">
          Vercel → Settings → Environment Variables. Railway → Variables tab. Never paste your .env file into your code.
        </Step>
      </div>

      <Callout type="warning">
        If you already have keys hardcoded in your GitHub repo: <strong>rotate them immediately</strong> (generate new ones in Supabase/OpenAI/Stripe) and then move them to environment variables. Assume the old keys are compromised.
      </Callout>
    </div>
  ),
};

export default function GuidePage() {
  const [open, setOpen] = useState<string>("github-what");

  const S = {
    page: { minHeight: "100vh", background: "var(--surface-main)", display: "flex", flexDirection: "column" as const },
    card: { background: "var(--surface-alt)", border: "1px solid var(--border-subtle)", borderRadius: "10px" },
  };

  return (
    <div style={S.page}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: "52rem", margin: "0 auto", padding: "2rem 1.5rem", paddingTop: "5.5rem", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem" }} className="animate-in">
          <div style={{ marginBottom: "0.75rem" }}>
            <span className="badge badge-green">
              <BookOpen style={{ width: "10px", height: "10px" }} />
              For non-technical founders
            </span>
          </div>
          <h1 className="text-headline" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "0.75rem" }}>
            Everything you need to know.<br />
            <span style={{ color: "var(--green)" }}>In plain English.</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "42rem" }}>
            You built something cool with AI. Now let&apos;s make sure it&apos;s secure, deployed properly, and ready for real users — without needing a CS degree.
          </p>
        </div>

        {/* Accordion sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }} className="animate-in stagger-1">
          {SECTIONS.map((section) => {
            const isOpen = open === section.id;
            const Icon = section.icon;
            return (
              <div key={section.id} style={{ ...S.card, overflow: "hidden" }}>
                <button
                  onClick={() => setOpen(isOpen ? "" : section.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "1.125rem 1.25rem", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: "32px", height: "32px", flexShrink: 0, borderRadius: "8px",
                    background: isOpen ? "var(--green-dim)" : "var(--surface-elevated)",
                    border: `1px solid ${isOpen ? "var(--green-border)" : "var(--border-subtle)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: "14px", height: "14px", color: isOpen ? "var(--green)" : "var(--text-secondary)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                        {section.title}
                      </span>
                      {section.badge && (
                        <span style={{
                          fontSize: "0.625rem", fontWeight: 700, padding: "1px 7px", borderRadius: "999px",
                          background: `${section.badgeColor}18`,
                          color: section.badgeColor,
                          border: `1px solid ${section.badgeColor}33`,
                          textTransform: "uppercase" as const, letterSpacing: "0.05em",
                        }}>{section.badge}</span>
                      )}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown style={{ width: "16px", height: "16px", color: "var(--text-tertiary)", flexShrink: 0 }} />
                  ) : (
                    <ChevronRight style={{ width: "16px", height: "16px", color: "var(--text-tertiary)", flexShrink: 0 }} />
                  )}
                </button>

                {isOpen && (
                  <div style={{ padding: "0 1.25rem 1.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.7, borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem" }}>
                    {sectionContent[section.id]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: "3rem", background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: "12px", padding: "2rem", textAlign: "center" }} className="animate-in stagger-2">
          <Shield style={{ width: "32px", height: "32px", color: "var(--green)", margin: "0 auto 1rem" }} />
          <h3 className="text-headline" style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Ready to check if your app is secure?
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Free scan. No account needed. Takes 60 seconds.
          </p>
          <Link href="/" className="btn btn-green" style={{ padding: "10px 24px" }}>
            Scan My App for Free
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
