"""
Greenlit — AI Sidekick Chat Service

Takes a user question and the existing analysis report,
answers questions about the codebase using Gemini.
Includes model fallback chain and empty-report guard.
"""
import os
import json


def chat_with_codebase(question: str, report: dict) -> str:
    """
    Answer a user's question about their codebase using the existing analysis report.
    Falls back gracefully if Gemini is unavailable.
    """
    if not question or not question.strip():
        return "Please ask a question about your app — for example, 'Is my login secure?' or 'What database am I using?'"

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return "I'm running in demo mode. Add a GEMINI_API_KEY to your .env to enable real Q&A."

    # Guard against empty or missing report
    if not report or (isinstance(report, dict) and len(report) == 0):
        return (
            "I don't have any analysis data to work with yet. "
            "Run a scan first by pasting your GitHub URL, then ask me questions about the results."
        )

    from google import genai
    client = genai.Client(api_key=api_key)

    # Build context from the existing report (truncate to avoid token limits)
    context = json.dumps(report, indent=2)
    if len(context) > 30000:
        context = context[:30000] + "\n... [truncated]"

    prompt = f"""You are Greenlit AI Sidekick — a friendly, concise assistant that helps
non-technical "vibe coders" understand their codebase.

Here is the analysis report for their repository:
{context}

The user asks: {question}

Answer in 2-3 sentences maximum. Use simple, non-technical language. 
Be direct and helpful. If asked about fixes, reference the "Copy Fix for Cursor" button.
If asked about architecture, use real-world metaphors (restaurant, kitchen, etc.)."""

    # Model fallback chain — try fastest/cheapest first
    model_candidates = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
    ]

    for model_name in model_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            err_str = str(e).lower()
            # If rate limited, try next model
            if "429" in err_str or "quota" in err_str or "rate" in err_str:
                continue
            # For other errors, return user-friendly message
            return f"Sorry, I couldn't process that right now. Try again in a moment."

    return "I'm temporarily overloaded. Please try again in a minute — the AI service is rate-limited on the free tier."
