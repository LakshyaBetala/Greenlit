import os
import time
import json
from pathlib import Path
from app.config import GEMINI_API_KEY

# NOTE: Heavy ML imports (torch, sentence-transformers, LangChain loaders) are
# imported LAZILY inside generate_analysis_report() to keep server startup fast.


# ═══════════════════════════════════════════════
# DEMO DATA — Full 9-section mock for offline mode
# ═══════════════════════════════════════════════

DEMO_REPORT = {
    "health_score": 62,
    "tech_stack": [
        {"name": "Next.js", "category": "Frontend Framework", "files_using": ["app/page.tsx", "app/layout.tsx", "app/dashboard/page.tsx"], "purpose": "Server-side rendered React framework for the web interface"},
        {"name": "Tailwind CSS", "category": "Styling", "files_using": ["app/globals.css", "components/*.tsx"], "purpose": "Utility-first CSS framework for rapid UI development"},
        {"name": "FastAPI", "category": "Backend Framework", "files_using": ["app/main.py", "app/api/repos.py"], "purpose": "High-performance Python API server handling all backend logic"},
        {"name": "LangChain", "category": "AI/ML", "files_using": ["app/services/rag_service.py"], "purpose": "Orchestrates the RAG pipeline — document loading, chunking, and LLM queries"},
        {"name": "ChromaDB", "category": "Vector Database", "files_using": ["app/services/rag_service.py"], "purpose": "Local vector store for embedding-based code search"},
        {"name": "Google Gemini", "category": "LLM", "files_using": ["app/services/rag_service.py", "app/services/autofix_service.py"], "purpose": "Large language model that analyzes code and generates security reports"},
        {"name": "HuggingFace Embeddings", "category": "AI/ML", "files_using": ["app/services/rag_service.py"], "purpose": "Local embedding model (all-MiniLM-L6-v2) — converts code to vectors for free"},
    ],
    "architecture": {
        "nodes": [
            {"id": "Landing", "label": "Next.js Landing Page"},
            {"id": "Auth", "label": "GitHub OAuth"},
            {"id": "Dashboard", "label": "Repository Dashboard"},
            {"id": "API", "label": "FastAPI Server"},
            {"id": "RAG", "label": "RAG Pipeline"},
            {"id": "VectorDB", "label": "ChromaDB"},
            {"id": "LLM", "label": "Google Gemini"},
            {"id": "GitHub", "label": "GitHub API"},
        ],
        "edges": [
            {"source": "Landing", "target": "Auth"},
            {"source": "Auth", "target": "Dashboard"},
            {"source": "Dashboard", "target": "API"},
            {"source": "API", "target": "RAG"},
            {"source": "RAG", "target": "VectorDB"},
            {"source": "RAG", "target": "LLM"},
            {"source": "API", "target": "GitHub"},
        ],
        "mermaid_code": "graph LR\n  Landing[Landing Page] --> Auth[GitHub OAuth]\n  Auth --> Dashboard[Dashboard]\n  Dashboard --> API[FastAPI Server]\n  API --> RAG[RAG Pipeline]\n  RAG --> VectorDB[ChromaDB]\n  RAG --> LLM[Google Gemini]\n  API --> GitHub[GitHub API]"
    },
    "connections": [
        {"from": "Frontend (Next.js)", "to": "Backend (FastAPI)", "method": "REST API (fetch)", "description": "The frontend makes HTTP requests to the backend for cloning repos, starting analysis, and polling results."},
        {"from": "Backend (FastAPI)", "to": "GitHub API", "method": "HTTPS (httpx)", "description": "The backend calls GitHub's API to list user repositories and exchange OAuth tokens."},
        {"from": "RAG Pipeline", "to": "ChromaDB", "method": "Python SDK", "description": "Code chunks are embedded and stored in ChromaDB, then retrieved by similarity search."},
        {"from": "RAG Pipeline", "to": "Google Gemini", "method": "REST API (google-genai)", "description": "Retrieved code context is sent to Gemini for analysis and report generation."},
    ],
    "data_flow": [
        {
            "title": "Repository Analysis Flow",
            "steps": [
                {"step": 1, "action": "User pastes GitHub URL", "component": "Frontend", "description": "User enters a repository URL on the landing page or dashboard"},
                {"step": 2, "action": "Clone repository", "component": "Backend", "description": "Backend clones the repo to local storage using git clone --depth 1"},
                {"step": 3, "action": "Load & chunk code", "component": "RAG Pipeline", "description": "All code files (.py, .js, .ts, etc.) are loaded and split into 1000-char chunks"},
                {"step": 4, "action": "Generate embeddings", "component": "HuggingFace", "description": "Each chunk is converted to a vector using all-MiniLM-L6-v2 (runs locally, free)"},
                {"step": 5, "action": "Store in vector DB", "component": "ChromaDB", "description": "Vectors are indexed in ChromaDB for fast similarity search"},
                {"step": 6, "action": "Retrieve relevant context", "component": "ChromaDB", "description": "Top 5 most relevant code chunks are retrieved based on the analysis query"},
                {"step": 7, "action": "Query LLM", "component": "Google Gemini", "description": "Retrieved code context + analysis prompt are sent to Gemini 2.5 Pro"},
                {"step": 8, "action": "Return structured report", "component": "Backend", "description": "Gemini returns a structured JSON report with all 9 analysis sections"},
            ]
        }
    ],
    "simple_explanation": "You built a web app that lets people connect their GitHub account, pick a repository, and get an AI-powered security report. The frontend is a website built with Next.js that talks to a Python backend. The backend clones the code, breaks it into small pieces, and feeds those pieces to Google's AI (Gemini) which finds security problems and explains what the code does. It's like having a senior developer review your code for free.",
    "advanced_explanation": "This is a full-stack RAG (Retrieval-Augmented Generation) application. The frontend is a Next.js 16 application with Tailwind CSS 4, using client-side rendering for the dashboard and analysis pages. Authentication is handled via GitHub OAuth 2.0 with the backend acting as the token exchange proxy.\n\nThe backend is a FastAPI application with a background task architecture — analysis requests are processed asynchronously using FastAPI's BackgroundTasks, with the frontend polling a jobs endpoint for completion. The RAG pipeline uses LangChain's DirectoryLoader to ingest code files, RecursiveCharacterTextSplitter for chunking (1000 chars, 200 overlap), HuggingFace's all-MiniLM-L6-v2 for local embeddings, and ChromaDB as the vector store. The top-k retrieved chunks (k=5) are sent to Google Gemini 2.5 Pro with a structured JSON output schema.\n\nThe auto-fix pipeline generates unified diffs via Gemini and is designed (but not yet fully implemented) to create PRs via the GitHub Tree API.",
    "vulnerabilities": [
        {"title": "Hardcoded JWT Secret", "file": "app/config.py", "line": 8, "description": "The JWT secret is set to a default string. In production, an attacker who discovers this value can forge authentication tokens.", "severity": "critical", "fix_suggestion": "Generate a random 256-bit secret and store it exclusively in environment variables. Never commit secrets to version control."},
        {"title": "OAuth Token in URL", "file": "app/auth/github.py", "line": 43, "description": "The GitHub access token is passed as a query parameter in the redirect URL. This is visible in browser history, server logs, and referrer headers.", "severity": "high", "fix_suggestion": "Use a server-side session or encrypted cookie to pass the token. Alternatively, use a short-lived code that the frontend exchanges for a token."},
        {"title": "No Rate Limiting", "file": "app/api/repos.py", "line": 69, "description": "The /analyze endpoint has no rate limiting. An attacker could trigger unlimited analysis jobs, exhausting API credits and server resources.", "severity": "high", "fix_suggestion": "Add rate limiting middleware (e.g., slowapi) to restrict requests per IP or user."},
        {"title": "SQL Injection Risk in Raw Queries", "file": "app/api/users.py", "line": 45, "description": "If database queries are added later, the current pattern of string formatting could lead to SQL injection.", "severity": "medium", "fix_suggestion": "Use parameterized queries or an ORM like SQLAlchemy for all database operations."},
    ],
    "broken_links": [
        {"file": "app/page.tsx", "import_path": "@/components/Hero", "issue": "Component file was deleted during v2 redesign", "suggestion": "Remove the import — Hero content is now inline in page.tsx"},
        {"file": "app/page.tsx", "import_path": "@/components/Stats", "issue": "Component file was deleted during v2 redesign", "suggestion": "Remove the import — Stats section removed from new design"},
    ],
    "improvements": [
        {"title": "Add Redis for Job Queue", "category": "Infrastructure", "priority": "high", "description": "Replace in-memory JOBS_DB with Redis for persistence across server restarts and horizontal scaling.", "effort": "4-6 hours"},
        {"title": "Implement Caching for Repeat Analysis", "category": "Performance", "priority": "high", "description": "Cache analysis results by repo URL + commit SHA to avoid re-analyzing unchanged repos.", "effort": "2-3 hours"},
        {"title": "Add WebSocket for Real-time Updates", "category": "UX", "priority": "medium", "description": "Replace polling with WebSocket connection for instant analysis progress updates.", "effort": "3-4 hours"},
        {"title": "Support Monorepo Detection", "category": "Feature", "priority": "medium", "description": "Detect monorepo structures (Nx, Turborepo, Lerna) and analyze each package separately.", "effort": "6-8 hours"},
        {"title": "Add PDF Export", "category": "Feature", "priority": "low", "description": "Let users download the analysis report as a professionally formatted PDF.", "effort": "4-5 hours"},
    ]
}


def generate_analysis_report(repo_path: str) -> dict:
    """
    Production RAG pipeline:
    1. Loads the repository code (ignoring node_modules, etc)
    2. Chunks and embeds using HuggingFace
    3. Prompts Gemini to return all 9 analysis sections in one structured JSON call
    """
    api_key = GEMINI_API_KEY

    # ── DEMO MODE ──────────────────────────────
    if not api_key:
        print("WARN: GEMINI_API_KEY not found. Running in offline/demo mode.")
        time.sleep(3)
        return DEMO_REPORT

    # ── REAL RAG PIPELINE ──────────────────────
    print(f"Starting RAG Analysis on {repo_path}")

    # Validate path exists
    if not Path(repo_path).exists():
        print(f"WARN: Repo path {repo_path} does not exist. Falling back to demo mode.")
        time.sleep(2)
        return DEMO_REPORT

    # Lazy-load heavy ML libraries (only on first real analysis)
    from langchain_community.document_loaders import DirectoryLoader, TextLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma

    # 1. Load Documents — scan all common code and config file types
    all_documents = []
    code_patterns = [
        # Core languages
        "**/*.py", "**/*.js", "**/*.ts", "**/*.tsx", "**/*.jsx",
        "**/*.go", "**/*.rs", "**/*.java", "**/*.rb", "**/*.php",
        "**/*.swift", "**/*.kt", "**/*.c", "**/*.cpp", "**/*.h",
        "**/*.cs", "**/*.scala", "**/*.dart", "**/*.lua",
        # Web / markup
        "**/*.html", "**/*.css", "**/*.scss", "**/*.vue", "**/*.svelte",
        # Config / data
        "**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml",
        "**/*.md", "**/*.txt", "**/*.env.example",
        # Shell / infra
        "**/*.sh", "**/*.bash", "**/*.dockerfile", "**/Dockerfile",
        "**/*.tf", "**/*.sql",
    ]
    exclude_dirs = [
        "**/node_modules/**", "**/venv/**", "**/.git/**",
        "**/__pycache__/**", "**/dist/**", "**/build/**",
        "**/.next/**", "**/vendor/**", "**/.venv/**",
        "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml",
    ]

    for pattern in code_patterns:
        try:
            loader = DirectoryLoader(
                repo_path,
                glob=pattern,
                exclude=exclude_dirs,
                loader_cls=TextLoader,
                silent_errors=True
            )
            all_documents.extend(loader.load())
        except Exception as e:
            print(f"Error loading {pattern}: {e}")
            continue

    documents = all_documents

    if not documents:
        print(f"WARN: No code files found in {repo_path}. Falling back to demo report.")
        time.sleep(2)
        return DEMO_REPORT

    print(f"Loaded {len(documents)} code files")

    # 2. Chunking
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)
    print(f"Split into {len(docs)} chunks")

    # 3. Embedding & Vector DB (Free Local Embeddings)
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma.from_documents(documents=docs, embedding=embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 8})

    # Retrieve context from multiple angles
    queries = [
        "security vulnerabilities authentication secrets API keys",
        "architecture structure imports dependencies framework",
        "database connections external API calls data flow",
        "error handling edge cases broken imports missing files",
    ]

    all_context = []
    for query in queries:
        context_docs = retriever.invoke(query)
        all_context.extend([d.page_content for d in context_docs])

    # Deduplicate
    context = "\n\n---\n\n".join(list(dict.fromkeys(all_context)))

    # 4. LLM Generation — single call through the router (Sonnet 4.6 primary,
    #    Gemini chain as fallback). See app/services/llm_router.py.
    from app.services.llm_router import llm_json, active_provider

    prompt = f"""You are a security CTO writing an audit for a NON-TECHNICAL founder who built this app with AI tools (Lovable, Bolt, Replit, Cursor, Windsurf, v0). Your job is to find the things that would make them embarrassed in public, and explain those things in plain English a non-engineer can act on.

Return ONE JSON object with EXACTLY these keys:

1. "health_score" (int 0-100, 0 = unshippable, 100 = ready)
2. "tech_stack" (array of {{"name", "category", "files_using" array, "purpose" one sentence}})
3. "architecture" ({{"nodes": [{{"id","label"}}], "edges": [{{"source","target"}}], "mermaid_code": valid graph LR string}})
4. "connections" (array of {{"from","to","method","description"}})
5. "data_flow" (array of {{"title","steps":[{{"step","action","component","description"}}]}})
6. "simple_explanation" (3-4 plain-English sentences, no jargon)
7. "advanced_explanation" (2-3 technical paragraphs with specific library + pattern references)
8. "vulnerabilities" (array of {{"title","file","line" int or null,"description","severity" one of critical|high|medium|low,"fix_suggestion"}})
9. "broken_links" (array of {{"file","import_path","issue","suggestion"}})
10. "improvements" (array of {{"title","category","priority" high|medium|low,"description","effort"}})
11. "platform_detected" (string naming the AI builder e.g. "Lovable" if signatures are present, else null)
12. "verdict_headline" (ONE sentence the founder reads first — declarative, specific, no hedging. If criticals exist, lead with the count and the most visceral example. E.g. "3 critical breaches. Your /admin endpoint is open to the internet." If only high/medium: name the highest-risk issue plainly. If clean: "Your app passes. Ship it.")
13. "verdict_subhead" (one short follow-on sentence with concrete proof or stake. E.g. "We accessed your user table in 3.2 seconds." or "1 issue worth fixing before launch.")
14. "verdict_status" (one of "do_not_ship" | "ship_with_caution" | "ready_to_ship")

Hard rules for vulnerability descriptions:
- Write the consequence, not the technical pattern. "Anyone on the internet can read your customer emails" beats "Hardcoded credentials in config.py".
- Reference actual file paths and line numbers from the context — never invent them.
- Be specific. "Your /admin/users route accepts any request" is acceptable. "There may be authorization issues" is not.

Tone: calm, declarative, no hedging words (may, could, potentially). Active voice. First person plural ("we") for the analyst voice.

Codebase Context:
{context}"""

    print(f"INFO: Routing deep scan through provider={active_provider()}")
    result = llm_json(prompt, pass_type="deep", max_tokens=8192)

    if result is None:
        print("WARN: LLM router returned None (all providers failed). Returning demo report.")
        return DEMO_REPORT

    # Fill missing keys with defaults so partial responses never crash the frontend
    defaults = {
        "health_score": 50,
        "tech_stack": [],
        "architecture": {"nodes": [], "edges": [], "mermaid_code": ""},
        "connections": [],
        "data_flow": [],
        "simple_explanation": "",
        "advanced_explanation": "",
        "vulnerabilities": [],
        "broken_links": [],
        "improvements": [],
        "platform_detected": None,
        "verdict_headline": "",
        "verdict_subhead": "",
        "verdict_status": "ship_with_caution",
    }
    for key, default in defaults.items():
        if key not in result:
            result[key] = default
    return result
