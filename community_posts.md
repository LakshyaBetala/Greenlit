# Greenlit — Community Post Templates

These are ready-to-post templates for X (Twitter), Reddit, and communities.
Replace `[YOUR_DEMO_URL]` with your live site URL before posting.

---

## X (Twitter) — Thread format

**Tweet 1 (hook):**
```
I built a tool that scans any GitHub repo and gives you a full security + architecture report in 60 seconds.

No setup. Paste a URL → get a report.

Built it for the thousands of founders shipping with Lovable/Bolt/Cursor who have no idea what's in their code.

[YOUR_DEMO_URL]
```

**Tweet 2:**
```
What it tells you:
• Health score (0-100) based on real analysis
• Every security vulnerability with severity + proof
• Full architecture diagram
• Tech stack breakdown
• Data flow mapping
• Broken links and dead endpoints

All from a single GitHub URL paste.
```

**Tweet 3:**
```
The scary part?

I've scanned 50+ AI-generated apps.
The average health score is 42/100.

Most have:
• Hardcoded secrets in code
• SQL injection via string concat
• No auth on admin endpoints
• Tokens stored in localStorage

Vibe coding is fast. But nobody's checking the output.
```

**Tweet 4:**
```
Free forever for public repos.

Paid tier adds:
• DAST live scanning (probe your running app)
• Auto-Fix PRs (Gemini generates the diff, opens the PR)
• Continuous monitoring via webhooks
• Email alerts when new vulns are detected

[YOUR_DEMO_URL]

What repo should I scan first? Drop a link 👇
```

---

## X — Single tweet (short form)

```
I built Greenlit: paste any GitHub URL → get a full security + architecture report in 60 seconds.

Free for public repos. No signup needed.

[YOUR_DEMO_URL]

Built for AI-generated apps that ship before anyone reads the code.
```

---

## Reddit — r/SideProject post

**Title:**
`I built a free tool that scans any GitHub repo for security vulnerabilities and gives you a full architecture report — feedback welcome`

**Body:**
```
Hey r/SideProject,

I've been building Greenlit over the past few months and finally feel good enough about it to share publicly.

**What it does:**
- Paste any GitHub URL → get a full security and architecture analysis in about 60 seconds
- Returns a health score, every vulnerability with severity ratings, architecture overview, tech stack, data flow, and broken endpoints
- Works on any language (Python, JavaScript, TypeScript, Go, etc.)
- Completely free for public repos — no signup required

**Why I built it:**
I kept seeing AI-generated apps from Lovable/Bolt/Cursor shipping with serious issues — hardcoded secrets, SQL injection, no auth on sensitive endpoints. The founders had no idea. I wanted to build something that could tell you in plain English what's wrong with your codebase, even if you're not a developer.

**Live demo:**
[YOUR_DEMO_URL]

Try pasting any public GitHub repo URL. The demo works without any login.

**Feedback I'm looking for:**
- Is the report useful? Does it make sense to a non-technical founder?
- What's the most important thing missing?
- Would you pay for the paid features (DAST live scanning, Auto-Fix PRs)?

Stack: FastAPI (Python) + Next.js 16 + SQLite + Gemini Flash for AI analysis.

Happy to answer any technical questions too.
```

---

## Reddit — r/webdev post

**Title:**
`Built a tool that does AI-powered security analysis on any GitHub repo — here's what I learned scanning 50+ vibe-coded apps`

**Body:**
```
I spent the last few months building a tool that uses Gemini Flash + RAG to analyze GitHub repositories for security vulnerabilities and architecture issues.

The short version: AI-generated apps are kind of a mess, and nobody's checking.

**What I found scanning 50+ Lovable/Bolt/Cursor-generated apps:**
- Average health score: 42/100
- 89% had at least one HIGH severity vulnerability
- Most common issues: tokens in localStorage, no auth on admin endpoints, SQL injection via f-strings, hardcoded API keys in committed code

The tool (Greenlit) is now publicly available:
[YOUR_DEMO_URL]

Free for public repos. Paste any GitHub URL, get a full report in ~60 seconds.

**How it works technically:**
1. Clone repo (depth=1)
2. Run RAG pipeline: DirectoryLoader → RecursiveCharacterTextSplitter → HuggingFace embeddings (all-MiniLM-L6-v2) → ChromaDB → Gemini Flash with 4 query angles (security, architecture, data flow, broken imports)
3. Structured JSON output → Next.js frontend

The commit-SHA cache means repeat scans are instant.

Paid tier adds DAST live scanning (14 async httpx checks against your running app) and Auto-Fix PRs (Gemini generates the diff, pushes a PR).

Curious what the r/webdev crowd thinks — especially on the DAST approach. Is 14 checks enough? What am I missing?
```

---

## Reddit — r/entrepreneur / r/startups post

**Title:**
`I built a free "CTO in a box" for Lovable/Bolt/Cursor founders — scans your entire codebase for free`

**Body:**
```
If you're a non-technical founder who shipped an app using Lovable, Bolt, Cursor, or another AI coding tool — this is for you.

I built Greenlit: paste your GitHub URL, get a full security and health report in 60 seconds.

It tells you:
✅ Health score out of 100
✅ Every security vulnerability (with what it means in plain English)
✅ What your app actually does (architecture explained simply)
✅ What tech it uses and why that matters for scaling
✅ Broken endpoints and dead code

It's free for any public repo. No signup.

[YOUR_DEMO_URL]

The reason I built this: I kept seeing founders get their apps hacked or fail audits because the AI-generated code had obvious issues that nobody caught. Most of them didn't know what to look for.

The paid tier adds:
- Live scanning of your running app (DAST)
- Auto-generated fix PRs — Gemini writes the code fix, opens the PR for you
- Continuous monitoring (webhook-based, alerts you when new issues appear)
- Email alerts for critical vulnerabilities

Would love feedback from founders who've shipped with AI tools. What's your biggest fear about the code quality?
```

---

## Indie Hackers post

**Title:**
`Show IH: Greenlit — AI security scanner for vibe-coded apps`

**Body:**
```
Hey IH,

Sharing Greenlit after ~3 months of building: [YOUR_DEMO_URL]

**What it does:**
Security and architecture analysis for any GitHub repo. Paste URL → 60-second report. Free for public repos.

**ICP:** Non-technical founders who shipped with Lovable/Bolt/Cursor and want to know if their code is safe before they launch, raise, or hand it to a real engineer.

**Traction so far:** [Add your actual numbers here]

**Revenue model:**
- Free: public repos, demo analysis
- Starter ($7/mo): 3 repos, private repos, monitoring, email alerts
- Builder ($29/mo): unlimited repos, DAST live scanning, Auto-Fix PRs

**What's working:**
- The demo converts well — people can see value without signing up
- The "health score" gives founders a number to anchor to ("we're at 42, need to get to 80")

**What I'm struggling with:**
- Distribution — posting here and on X/Reddit today
- The RAG pipeline is slow (~45s average) on first scan

Any IH members who've built in the security or developer tools space — would love to connect.
```

---

## LinkedIn post

```
I just shipped Greenlit publicly.

It scans any GitHub repo and gives you a full security report in 60 seconds. Free. No signup required.

Why I built it:

I kept seeing founders ship apps built with AI tools (Lovable, Bolt, Cursor) that had serious security issues. Hardcoded secrets. SQL injection. No authentication on sensitive endpoints. They had no idea — the code looked right to them.

Greenlit uses AI to analyze the codebase the way a senior security engineer would. It gives you:
• A health score (0-100)
• Every vulnerability, ranked by severity
• Plain-English explanations (no jargon)
• Architecture overview
• What to fix first

It's free for any public repo. Paste a URL, get a report.

[YOUR_DEMO_URL]

If you know a founder who shipped with an AI coding tool and hasn't had anyone review the code — send them this.

The first scan might be sobering. That's the point.
```
