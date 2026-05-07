"""
Greenlit AI Report Service — Fix Prompt Generator

Generates AI-assistant-ready fix prompts that non-technical founders
can copy-paste into Cursor, Lovable, or Bolt to get automatic fixes.

This is the closed-loop moat: AI built the bug → Greenlit finds it →
Greenlit generates the prompt → AI fixes the bug.
"""


def generate_fix_prompt(vulnerability: dict, tech_stack: list[dict] = None) -> str:
    """
    Generate a copy-pasteable prompt for Cursor/Lovable/Bolt
    that will fix the given vulnerability.

    Args:
        vulnerability: dict with keys: title, file, line, description, severity, fix_suggestion
        tech_stack: list of tech stack items from the analysis report

    Returns:
        A markdown-formatted prompt ready to paste into an AI assistant.
    """
    title = vulnerability.get("title", "Security Issue")
    file_path = vulnerability.get("file", "unknown file")
    line = vulnerability.get("line")
    description = vulnerability.get("description", "")
    severity = vulnerability.get("severity", "medium")
    fix_suggestion = vulnerability.get("fix_suggestion", "")

    # Detect framework from tech stack
    framework = "your app"
    if tech_stack:
        stack_names = [t.get("name", "").lower() for t in tech_stack]
        if any("next" in s for s in stack_names):
            framework = "Next.js"
        elif any("react" in s for s in stack_names):
            framework = "React"
        elif any("express" in s for s in stack_names):
            framework = "Express.js"
        elif any("fastapi" in s or "flask" in s or "django" in s for s in stack_names):
            framework = "Python backend"

    # Build the prompt
    location = f"`{file_path}`"
    if line:
        location += f" around line {line}"

    severity_label = {
        "critical": "🔴 CRITICAL",
        "high": "🟠 HIGH",
        "medium": "🟡 MEDIUM",
        "low": "🔵 LOW",
    }.get(severity, "⚪ UNKNOWN")

    prompt = f"""I have a security vulnerability in my {framework} app that needs to be fixed.

**Problem**: {title}
**Severity**: {severity_label}
**File**: {location}

**What's happening**: {description}

**What needs to change**: {fix_suggestion if fix_suggestion else f"Fix the {title.lower()} vulnerability in {file_path}."}

Please:
1. Fix this vulnerability in the specified file
2. Make sure the fix doesn't break any existing functionality
3. Add a comment explaining why this fix is important
4. If relevant, add a simple test to verify the fix works

Keep the fix minimal — only change what's necessary to close this security hole."""

    return prompt


def generate_fix_prompts_for_report(vulnerabilities: list[dict], tech_stack: list[dict] = None) -> list[dict]:
    """
    Generate fix prompts for all vulnerabilities in a report.

    Returns a list of dicts with 'vulnerability' and 'fix_prompt' keys.
    """
    results = []
    for vuln in vulnerabilities:
        prompt = generate_fix_prompt(vuln, tech_stack)
        results.append({
            "vulnerability": vuln,
            "fix_prompt": prompt,
        })
    return results


def generate_dast_fix_prompt(check_result: dict) -> str:
    """
    Generate a fix prompt for a DAST check failure.
    DAST results have different structure than static analysis vulns.

    Args:
        check_result: dict with keys: name, severity, passed, description, proof_request, proof_response, fix
    """
    if check_result.get("passed", True):
        return ""

    name = check_result.get("name", "Security Issue")
    severity = check_result.get("severity", "medium")
    description = check_result.get("description", "")
    proof_req = check_result.get("proof_request", "")
    proof_resp = check_result.get("proof_response", "")
    fix = check_result.get("fix", "")

    severity_label = {
        "critical": "🔴 CRITICAL",
        "high": "🟠 HIGH",
        "medium": "🟡 MEDIUM",
        "low": "🔵 LOW",
    }.get(severity, "⚪ UNKNOWN")

    prompt = f"""I have a runtime security issue in my deployed app that needs to be fixed.

**Problem**: {name}
**Severity**: {severity_label}

**What's happening**: {description}

**Proof — this is the actual attack that works right now**:
Request: {proof_req}
Response: {proof_resp}

**How to fix it**: {fix}

Please implement this fix. Make sure:
1. The fix prevents the attack shown above
2. Existing functionality still works
3. Add a comment explaining the security fix"""

    return prompt


def generate_architecture_education(report: dict) -> str:
    """
    Generate a 10-year-old-friendly explanation of what the user built.
    Uses real-world metaphors (restaurant, building, etc.) to make
    technical architecture accessible to non-technical founders.

    This is what makes Greenlit a "CTO in a Box" — not just finding problems,
    but helping users understand what they built.
    """
    tech_stack = report.get("tech_stack", [])
    connections = report.get("connections", [])
    vulnerabilities = report.get("vulnerabilities", [])
    health_score = report.get("health_score", 0)

    stack_names = [t.get("name", "").lower() for t in tech_stack]

    # Detect components
    has_nextjs = any("next" in s for s in stack_names)
    has_react = any("react" in s for s in stack_names)
    has_supabase = any("supabase" in s for s in stack_names)
    has_firebase = any("firebase" in s for s in stack_names)
    has_prisma = any("prisma" in s for s in stack_names)
    has_tailwind = any("tailwind" in s for s in stack_names)
    has_express = any("express" in s for s in stack_names)
    has_fastapi = any("fastapi" in s for s in stack_names)
    has_django = any("django" in s for s in stack_names)
    has_vercel = any("vercel" in s for s in stack_names)
    has_stripe = any("stripe" in s for s in stack_names)
    has_auth = any("auth" in s or "clerk" in s for s in stack_names)

    # Build the metaphor
    sections = []

    sections.append("🏗️ **Your App, Explained Like You're 10**\n")
    sections.append("Your app is like a **restaurant**. Here's how it works:\n")

    # Frontend
    if has_nextjs or has_react:
        frontend_name = "Next.js" if has_nextjs else "React"
        sections.append(
            f"🍽️ **THE MENU (Frontend — {frontend_name})**\n"
            "This is what your customers see when they visit your app. "
            "All the buttons, pages, forms, and pretty things. "
            f"It's built with {frontend_name}, which is like a fancy "
            "printing press that automatically creates menus for each customer.\n"
        )
    else:
        sections.append(
            "🍽️ **THE MENU (Frontend)**\n"
            "This is what your customers see. The buttons, pages, and forms.\n"
        )

    # Backend / Database
    if has_supabase:
        sections.append(
            "👨‍🍳 **THE KITCHEN + FRIDGE (Backend — Supabase)**\n"
            "Supabase is your kitchen AND your fridge combined. "
            "It stores all your data (user accounts, orders, etc.) "
            "and handles logins. Think of it as a self-running kitchen "
            "— you don't need to hire a chef (backend developer).\n"
        )
    elif has_firebase:
        sections.append(
            "👨‍🍳 **THE KITCHEN + FRIDGE (Backend — Firebase)**\n"
            "Firebase is Google's kitchen-in-a-box. It stores your data "
            "and handles logins automatically. The catch: the default "
            "settings leave the kitchen door wide open.\n"
        )
    elif has_express or has_fastapi or has_django:
        backend_name = "Express.js" if has_express else "FastAPI" if has_fastapi else "Django"
        sections.append(
            f"👨‍🍳 **THE KITCHEN (Backend — {backend_name})**\n"
            f"Your kitchen runs on {backend_name}. This is where the real "
            "work happens — processing orders, checking if someone is "
            "allowed to access certain data, and talking to the fridge (database).\n"
        )

    # Styling
    if has_tailwind:
        sections.append(
            "🎨 **THE DECORATIONS (Styling — Tailwind CSS)**\n"
            "Tailwind CSS is like the restaurant's interior designer. "
            "It makes everything look nice — the colors, spacing, and layout. "
            "It's purely cosmetic; it doesn't affect how the food tastes.\n"
        )

    # Payments
    if has_stripe:
        sections.append(
            "💳 **THE CASH REGISTER (Payments — Stripe)**\n"
            "Stripe handles all the money stuff. When a customer pays, "
            "Stripe processes the payment and sends you the money (minus a small fee). "
            "Important: Stripe keys must NEVER be in your frontend code.\n"
        )

    # Auth
    if has_auth:
        sections.append(
            "🔐 **THE BOUNCER (Authentication)**\n"
            "Your app has a bouncer that checks IDs at the door. "
            "It verifies that people are who they say they are "
            "before letting them in.\n"
        )

    # Deployment
    if has_vercel:
        sections.append(
            "🚚 **THE DELIVERY TRUCK (Hosting — Vercel)**\n"
            "Vercel is your delivery service. It takes your app "
            "and puts it on the internet so anyone can visit it. "
            "Every time you update your code, Vercel automatically "
            "delivers the new version.\n"
        )

    # Connection explanation
    sections.append(
        "🔌 **HOW THEY CONNECT**\n"
        "The menu (frontend) sends orders to the kitchen (backend) "
        "through a \"window\" called an API. When a customer clicks "
        "\"Sign Up\", the menu sends a message through this window "
        "to the kitchen, which creates their account in the fridge (database).\n"
    )

    # Health assessment
    if health_score >= 80:
        sections.append(
            f"✅ **HEALTH CHECK: {health_score}/100**\n"
            "Your restaurant is in good shape! The kitchen is clean, "
            "the doors have locks, and the fridge is organized. "
            "A few small improvements could make it even better — "
            "check the Improvements tab.\n"
        )
    elif health_score >= 50:
        sections.append(
            f"⚠️ **HEALTH CHECK: {health_score}/100**\n"
            "Your restaurant works, but some doors are unlocked "
            "and the fire extinguisher is missing. Nothing is on fire "
            "yet, but you should fix the issues in the Vulnerabilities tab "
            "before you get more customers.\n"
        )
    else:
        vuln_count = len(vulnerabilities)
        sections.append(
            f"🚨 **HEALTH CHECK: {health_score}/100**\n"
            f"Your restaurant has {vuln_count} open problems. "
            "Some doors are wide open, and strangers might be able "
            "to walk into the kitchen and look at customer data. "
            "Fix the Vulnerabilities tab items ASAP — especially "
            "anything marked CRITICAL.\n"
        )

    return "\n".join(sections)
