"""
Greenlit — LLM Router

Single entry point for all LLM JSON generation in the system. Routes by
pass type and falls back from Anthropic → Gemini chain on any failure.

  - "deep"     → Claude Sonnet 4.6 (first audit, vuln descriptions, autofix diffs)
  - "headline" → Claude Sonnet 4.6 (one-sentence verdict generation)
  - "tick"     → Claude Haiku 4.5 (hourly monitoring classifications, diff scans, bot pre-screens)

Load-bearing rule: the product MUST run without ANTHROPIC_API_KEY. When the
Anthropic call fails or the key is missing, we fall back to the existing
6-model Gemini chain. Callers that get `None` should use their own sensible
default (e.g., DEMO_REPORT).

See: specs/2026-05-13-product-redesign.md §6.1 (Model stack).
"""
import json
import re
import time
from typing import Literal, Optional

from app.config import ANTHROPIC_API_KEY, GEMINI_API_KEY

PassType = Literal["deep", "headline", "tick"]


# Model selection per pass type. Update here when upgrading models — every
# service goes through this router so the upgrade is one-line.
_ANTHROPIC_MODELS: dict[PassType, str] = {
    "deep": "claude-sonnet-4-6",
    "headline": "claude-sonnet-4-6",
    "tick": "claude-haiku-4-5-20251001",
}

# Gemini fallback chain. Same order as the prior rag_service.py logic so
# behavior in degraded mode is identical to current production.
_GEMINI_FALLBACK = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]

# System prompt that forces strict JSON output from Claude. Anthropic doesn't
# expose a `response_mime_type=json` equivalent to Gemini, so we force the
# format via instruction + parse defensively.
_JSON_SYSTEM = (
    "You are a security analyst. Respond with a single valid JSON object "
    "and nothing else. No markdown fences. No prose before or after. "
    "Begin with { and end with }."
)


def _extract_json(text: Optional[str]) -> Optional[dict]:
    """Parse strict JSON, or extract the first {...} block from prose-wrapped output."""
    if not text:
        return None
    text = text.strip()
    # Strip common markdown fence patterns
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _try_anthropic(pass_type: PassType, prompt: str, max_tokens: int) -> Optional[dict]:
    """Try the Anthropic model for `pass_type`. Returns None on any failure."""
    if not ANTHROPIC_API_KEY:
        return None
    try:
        from anthropic import Anthropic
    except ImportError:
        print("WARN: anthropic SDK not installed. Skipping to Gemini fallback.")
        return None

    model = _ANTHROPIC_MODELS[pass_type]
    try:
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=_JSON_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text if response.content else ""
        parsed = _extract_json(text)
        if parsed is not None:
            print(f"INFO: LLM pass={pass_type} completed using {model}")
            return parsed
        print(f"WARN: {model} returned non-JSON output. Falling back to Gemini.")
        return None
    except Exception as e:
        print(f"WARN: Anthropic {model} call failed: {e}")
        return None


def _try_gemini(prompt: str, max_tokens: int) -> Optional[dict]:
    """Try the Gemini fallback chain. Returns None when every model failed."""
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("WARN: google-genai not installed.")
        return None

    client = genai.Client(api_key=GEMINI_API_KEY)
    last_err: Optional[Exception] = None
    for model_name in _GEMINI_FALLBACK:
        for attempt in range(2):  # retry once on rate limit
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                parsed = _extract_json(response.text)
                if parsed is not None:
                    print(f"INFO: LLM completed using {model_name} (Gemini fallback)")
                    return parsed
                # Parsed=None means JSON parse failed — try next model
                break
            except Exception as e:
                last_err = e
                err_str = str(e).lower()
                if ("429" in err_str or "quota" in err_str or "rate" in err_str) and attempt == 0:
                    print(f"WARN: Rate limited on {model_name}, retrying in 3s...")
                    time.sleep(3)
                    continue
                print(f"WARN: Gemini {model_name} failed: {e}")
                break
    print(f"WARN: All Gemini fallback models failed (last error: {last_err}).")
    return None


def llm_json(
    prompt: str,
    pass_type: PassType = "deep",
    max_tokens: int = 8192,
) -> Optional[dict]:
    """
    Run `prompt` through the appropriate LLM and return parsed JSON.

    Tries Anthropic first (model picked from `pass_type`), then falls back
    to the Gemini chain. Returns None only when both providers failed —
    callers should handle that with a default (e.g., DEMO_REPORT).
    """
    result = _try_anthropic(pass_type, prompt, max_tokens)
    if result is not None:
        return result
    return _try_gemini(prompt, max_tokens)


def active_provider() -> str:
    """Diagnostic: return which provider would currently handle a request."""
    if ANTHROPIC_API_KEY:
        return "anthropic"
    if GEMINI_API_KEY:
        return "gemini"
    return "demo"
