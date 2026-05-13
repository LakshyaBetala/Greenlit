# Greenlit — Master Design Prompt

A self-contained design prompt for AI design tools (Claude, Claude Design, Cursor, v0, etc.). Paste the entire prompt below into your tool, then add a `Design:` line at the bottom asking for the specific component or page you want generated.

---

## HOW TO USE THIS PROMPT

Paste **everything between the two `══════` lines below** into Claude or your design tool. Append your specific request at the bottom in this format:

```
Design: <component or page name>
Constraints: <any extras beyond the rules in the prompt>
Deliverable: <HTML+CSS / Figma description / React component with inline styles / wireframe>
```

══════════════════════════════════════════════════════════════════════════════

# Design brief — Greenlit

You are designing UI for **Greenlit**, an AI-powered security audit tool. Greenlit attacks a founder's live application, finds vulnerabilities, generates the fix, and opens a real GitHub pull request. The product targets **non-technical founders** who built their app using AI coding tools (Lovable, Bolt, Cursor, Replit, v0, Windsurf).

**Positioning:** *"Live, continuous AI red-team for AI-built apps."*
**Tagline:** *"The final check before launch."*
**Wedge:** Live exploit demonstration — we don't just analyze code, we attack the running URL and screenshot the breach.

## Audience mental model

The founder you are designing for:

- 24–35 years old. Built a SaaS product on Lovable or Bolt in 2 weekends.
- Technical literacy: "can use Cursor" but cannot read a stack trace.
- Has 10–500 real users. Hasn't been breached *yet*. Worries about it constantly.
- Cannot afford a $300/hr security consultant.
- Values **speed, confidence, undeniable proof** above exhaustiveness.
- Will leave the page in 3 seconds if it feels generic, AI-generated, or like "yet another scanner."

If your design makes them feel "this is what a real CTO would build," you have succeeded. If it feels like a hackathon project — even subtly — you have failed.

## Design philosophy (the four words)

1. **Calm.** Like an X-ray, not a horror film.
2. **Factual.** Concrete numbers, declarative sentences. Never "may," "could," "potentially."
3. **Inevitable.** Confident silence, not loud claims.
4. **Professional.** Specifically: would Stripe ship this? If no, retune.

The best mental reference is **Linear** crossed with **Stripe Dashboard** crossed with **Have I Been Pwned**: dark, dense-when-it-needs-to-be, sharp typography, one accent color, generous whitespace.

# Spirit of these rules — read this first

The rules below exist because the alternative — designs without constraint — drifts toward AI slop. They are not a prison. They are a taste filter.

**Three principles override every specific rule:**

1. **The four philosophy words (Calm / Factual / Inevitable / Professional) are the meta-rules.** The specific rules are how those words usually manifest. When a rule and the philosophy disagree, philosophy wins.

2. **The founder's actual experience wins over any specific rule.** Example: rule 6 ("one CTA per screen") is right 90% of the time. But a Settings page legitimately has many peer actions; forcing it through one CTA creates artificial friction. Use judgment. The rule is a strong default, not a prison.

3. **Minimalism is not the goal.** Clarity is. If a rule, applied dogmatically, makes the UI feel cold or empty or generic, the rule has been over-applied. Minimalism without polish becomes lifelessness. Reach for "would Linear ship this?" not "did I check off rule 7?"

A design system should guide taste, not imprison it. When in doubt, ship the version that respects the user's intelligence and removes their confusion. Both.

## The 10 no-AI-slop rules (default — override with stated reason)

1. **No gradient backgrounds anywhere** except one exception: the post-scan Verdict Cinema severity tint (red/amber/green). Every other surface uses solid color.
2. **Zero emoji in product copy.** Ever. Headlines, buttons, alerts, errors, badges — emoji-free. `✓ ✗ 🚀 🇮🇳 💡 ⚠ 🍽️ 👨‍🍳` — all banned. Use Lucide React icons instead.
3. **No glow, no neon, no synthwave, no "hacker aesthetic."** No animated glitch effects, no scroll-jacking parallax, no cyberpunk vibes.
4. **System fonts only.** Inter, SF Pro Text, Geist, system-ui. No display fonts, no decorative Google Fonts, no AI-generated cursive. JetBrains Mono / SF Mono / Consolas for code.
5. **Tables for tabular data, never pill clouds.** Pills *only* for status (severity badges, verdict pill, plan-tier badge).
6. **One primary CTA per screen — strong default.** Secondary actions are text links, not competing buttons. Tertiary actions are ghost buttons. **Exception:** action clusters are valid in *workspace pages* (dashboard, settings, repo list, file management) where the founder is operating on many things at once. Distinction: if the page is **narrative** (landing, result, onboarding), one CTA wins. If the page is **operational**, multiple peer actions are fine — but never more than 4 visible at one density level.
7. **Concrete numbers, never vague claims.** Never "fast" — say "60 seconds." Never "secure" — say "14 attacks against your live URL." Never "many users" — say "1,247 apps."
8. **No fabricated testimonials.** Until real customers approve quotes in writing, do not include a testimonials section. An empty space is more honest than fake ones.
9. **Loading states show what's running** — never a generic spinner. Each loading state names the step (e.g., "Cloning your repo," "Attacking your live URL").
10. **Empty states have a real next-action sentence**, not placeholder copy. "Paste a GitHub URL to start your first scan" — not "Get started!" and never lorem.

## Voice and tone rules

- **Active voice always.** *"We found 3 issues"* — not *"3 issues were found."*
- **First person plural for Greenlit ("we"). Founder is "you." Never "the user."**
- **Concrete nouns over abstractions.** *"your /admin endpoint"* — not *"an exposed administrative interface."*
- **One verb per sentence.** *"Paste. Wait 60 seconds. Get the verdict."*
- **Banned vendor jargon:** "attack surface," "posture management," "shift-left," "zero-trust," "DevSecOps."
- **Banned superlatives:** "powerful," "amazing," "revolutionary," "best-in-class," "world-class," "next-gen."

# Design system tokens

These are the **only** values you may use. Generate every layout, color, and dimension from this palette.

## Theme — dark-mode-only in v1, light mode planned for v2

Greenlit is dark-mode-only as of v1. Light mode is on the v2 roadmap because:

- Founders take daytime screenshots for tweets and pitch decks.
- Investors and enterprise reviewers often work in light environments.
- Print and PDF exports look professional in light mode by default.

**Design every component using `var(--token-name)` references — never hard-coded hex values.** A light-mode rollout should require swapping the values in `:root.light`, not rewriting components. This single discipline is what makes light mode achievable later. If you find yourself typing a hex value inline anywhere except inside the token definitions themselves, you have made the v2 rollout 10× harder.

## Color tokens

```
═══ Surfaces ═══
--surface-main:      #0a0a0a    page background, body
--surface-alt:       #111111    slightly raised panels
--surface-elevated:  #161616    cards, modals, dropdowns, expanded rows

═══ Borders ═══
--border-subtle:     #1e1e1e    most borders (cards, dividers, inputs)
--border-strong:     #2a2a2a    emphasized borders, hover states

═══ Text ═══
--text-primary:      #eeeeee    headlines, primary body
--text-secondary:    #999999    descriptions, supporting copy
--text-tertiary:     #666666    labels, meta, captions
--text-disabled:     #444444    placeholders, disabled controls

═══ Brand accent (ONLY green — no other accent colors) ═══
--green:             #22c55e    primary brand color
--green-dim:         rgba(34, 197, 94, 0.08)    subtle green tint background
--green-border:      rgba(34, 197, 94, 0.20)    green outline
--green-text:        #86efac    green text on dark when needed

═══ Status colors (USE SPARINGLY — only for severity / verdict UI, never for chrome) ═══
--status-critical:   #ef4444    red — critical severity, "do not ship"
--status-high:       #f97316    orange — high severity
--status-medium:     #f59e0b    amber — medium severity, "ship with caution"
--status-low:        #3b82f6    blue — low severity, info
--status-success:    #22c55e    green — ready to ship, passed checks

═══ Special — Verdict Cinema gradients (the ONE exception to rule #1) ═══
do_not_ship:        radial-gradient(circle at 50% 0%, rgba(239,68,68,0.10), transparent 60%)
ship_with_caution:  radial-gradient(circle at 50% 0%, rgba(245,158,11,0.08), transparent 60%)
ready_to_ship:      radial-gradient(circle at 50% 0%, rgba(34,197,94,0.10), transparent 60%)
```

**Color rule:** Greenlit has ONE brand color (green). Everything else is grayscale + status indicators. No purple, no cyan, no pink, no rainbow. If you find yourself wanting a second accent color, use a different shade of gray.

## Typography

```
font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text",
             "Segoe UI", system-ui, sans-serif;
font-feature-settings: "ss01", "cv11";    -- enables Inter's stylistic alternates

═══ Type scale (use clamp() for fluid headlines) ═══
type-display:   clamp(2.5rem, 5vw, 4.5rem)   / -0.04em / weight 700  -- hero headlines
type-h1:        2.25rem                       / -0.035em / weight 700
type-h2:        1.75rem                       / -0.03em / weight 700
type-h3:        1.25rem                       / -0.02em / weight 600
type-body:      0.95rem                       / line-height 1.6 / weight 400
type-small:     0.85rem                       / line-height 1.5 / weight 400
type-caption:   0.75rem                       / line-height 1.4 / weight 500
type-label:     0.7rem                        / +0.08em / weight 600 / uppercase

═══ Monospace (code, file paths, terminal, mono-data) ═══
font-family: "JetBrains Mono", "SF Mono", ui-monospace, Consolas, monospace;
```

**Typography rule:** Negative letter-spacing on headlines (-0.02em to -0.04em). Body type at normal tracking. Labels at +0.08em + uppercase. This is what separates "designed" from "default."

## Spacing scale (4px base unit)

Use ONLY these values for padding, margin, gap:

```
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120
```

No 13px, no 17px, no 22px. If you need a value off-scale, reconsider — likely the wrong adjacent value.

## Layout

```
--max-width:        80rem (1280px)    page max-width
--reading-width:    36rem (576px)     centered body copy
--split-width:      56rem (896px)     two-column splits
--nav-height:       64px              fixed top nav

Section padding (vertical):
  Desktop:  80px
  Tablet:   56px
  Mobile:   40px

Section padding (horizontal):
  All:      1.5rem    scales via max-width
```

## Border radius

```
4px     code chips, small chips
6px     buttons, severity pills, small chips
8px     inputs, secondary cards
12px    primary cards, modals, hero panels
999px   status pills (full pill shape)
```

# Component specifications

Generate components that match these exact specs. Use lucide-react for ALL icons.

## Button — primary (`.btn.btn-green`)

```
background:       --green (#22c55e)
color:            #000  (black text on green is the highest-contrast pairing)
padding:          9px 18px (default)  |  13px 28px (large)
font-size:        0.875rem  |  weight 600  |  -0.005em
border-radius:    7px
border:           none
hover:            transform: scale(1.02); subtle 4px outer ring at rgba(34,197,94,0.15)
active:           transform: scale(0.98)
focus-visible:    outline: 2px solid var(--green); outline-offset: 2px
disabled:         opacity: 0.5; cursor: not-allowed; no hover
loading:          show step name (e.g., "Scanning") with a 6px green dot that pulses;
                  NEVER a generic spinner
icon (optional):  lucide, size 14, strokeWidth 2, on the right with 6px gap
```

## Button — outline / secondary (`.btn.btn-outline`)

```
background:       transparent
color:            --text-primary
padding:          9px 18px
border:           1px solid var(--border-subtle)
border-radius:    7px
hover:            border-color: var(--border-strong); color: white
```

## Button — ghost (`.btn.btn-ghost`)

```
background:       transparent
color:            --text-secondary
padding:          8px 14px
border:           none
border-radius:    6px
hover:            color: --text-primary; background: rgba(255,255,255,0.03)
```

## Input

```
background:       --surface-elevated
border:           1px solid var(--border-subtle)
color:            --text-primary
padding:          12px 14px
font-size:        0.95rem
border-radius:    8px
focus:            border-color: var(--green); no glow ring
placeholder:      color: var(--text-disabled)
disabled:         opacity 0.5
```

## Scan bar (the hero input — Greenlit's signature input)

A horizontal pill containing: leading icon · input · primary button (right-aligned). Used on the landing page hero and the `/explore` paste-and-scan flow.

```
container:
  background:     --surface-elevated
  border:         1px solid var(--border-subtle)
  border-radius:  12px
  padding:        6px 6px 6px 16px
  display:        flex; align-items: center; gap: 12px
  max-width:      560px (centered on hero)

leading icon:     GitBranch from lucide, size 15, color --text-tertiary

input:            flex: 1; transparent; no border; placeholder color --text-disabled

button:           btn-green; padding 9px 20px
```

## Badge / Pill (status only — never decoration)

```
display:          inline-flex
align-items:      center
gap:              6px
padding:          2px 10px
font-size:        0.7rem
font-weight:      600
text-transform:   uppercase
letter-spacing:   0.05em
border-radius:    999px
background:       rgba(<status>, 0.10)        -- 10% opacity
color:            rgba(<status>, 0.85)        -- 85% opacity
border:           none
icon (optional):  lucide, size 10, same color as text
```

## Card (default)

```
background:       --surface-elevated
border:           1px solid var(--border-subtle)
border-radius:    12px
padding:          1.5rem
NO box-shadow ever. Borders only. Shadows feel "AI-generated."

If clickable:
  cursor: pointer
  hover: border-color var(--border-strong)
  transition: border-color 150ms ease
```

## Severity dot (8px circle inline)

```
width: 8px; height: 8px
border-radius: 50%
background: <status color>
flex-shrink: 0
```

Inline rhythm element. Used to mark severity in lists without taking horizontal space.

## Code chip (file paths, function names, identifiers in body copy)

```
background:       --surface-main
border:           1px solid var(--border-subtle)
color:            --text-secondary
padding:          1px 6px
font-family:      monospace
font-size:        0.85em                       -- relative to surrounding text
border-radius:    4px
```

## Terminal block (Breach Proof)

The ONE place we use pure black (#000) and full-monospace coloring.

```
container:
  background:     #000
  border:         1px solid var(--border-subtle)
  border-radius:  8px
  font-family:    monospace, 0.75rem
  overflow:       hidden

header bar:
  background:     --surface-elevated
  padding:        8px 12px
  border-bottom:  1px solid var(--border-subtle)
  font-size:      0.7rem
  letter-spacing: 0.08em
  text-transform: uppercase
  color:          --text-tertiary
  display:        flex; justify-content: space-between; align-items: center
  contents:       label on left, copy button on right (lucide Copy, size 11)

body:
  padding:        14px
  line-height:    1.55
  white-space:    pre-wrap
  color:          #eeeeee  (default text)

  color hierarchy:
    prompts ($ commands):    #22c55e
    success responses (200): #fca5a5 (when 200 means "breached")
    failed responses (403):  #86efac (when 403 means "secure")
    default values:          #cccccc
    comments (# explainer):  #666666

footer (optional):
  padding:        6px 14px
  border-top:     1px solid var(--border-subtle)
  font-size:      0.65rem
  color:          --text-disabled
  contents:       "Proof captured <timestamp>"
```

### Proof variety — do not over-rely on terminal blocks

The terminal block is one of four valid proof formats. Use whichever fits the finding type. If 80% of a result page's findings show identical terminal blocks, the page becomes visually monotonous and the terminal block stops feeling earned.

| Proof format | When to use | Visual |
|---|---|---|
| **Terminal block** | DAST live probes — actual HTTP request + response | The component above |
| **Code excerpt** | Static findings — vulnerable function with file:line context | Inline `<pre>` styled like a code chip, file path label at top, ~6 lines of surrounding code with the affected line highlighted |
| **Screenshot** | UI-level findings — exposed admin panel, leaked secret visible in JS bundle | `<img>` of the actual screen, with red box annotations around the leak |
| **Side-by-side** | Before/after fix demonstrations, or vulnerable-vs-fixed code | Two terminal blocks (or two code excerpts) side-by-side with arrow between |

**Variety rule:** mix proof formats so the page feels like a real investigation, not a repeated template. The terminal block should feel like the verdict's most visceral evidence — used once or twice per page, not on every row.

## Progress / step indicator

For multi-step loading states. Each step is a row with: status icon (left), label, step counter (right).

```
container:
  flex-direction: column; gap: 0.5rem
  max-width: 32rem

step row:
  padding:          0.75rem 1rem
  background:       --surface-elevated (default)  |  rgba(34,197,94,0.05) (active)
  border:           1px solid var(--border-subtle)  |  rgba(34,197,94,0.25) (active)
  border-radius:    8px
  opacity:          1 (active/pending)  |  0.55 (done)
  transition:       all 200ms ease

step status icon:
  done:             lucide Check, 16px, --green
  active:           lucide Loader2, 16px, --green, rotating
  pending:          8px gray dot

step label:         0.9rem  |  --text-primary (active)  |  --text-secondary (pending)
step counter:       ml-auto, 0.7rem, --text-disabled, "Step 1/5"
```

## Severity-grouped vulnerability list (the layered view)

A two-level progressive disclosure list. Severity groups (critical/high/medium/low) collapsed by default with `critical` expanded. Within each group, each finding is a row — clicking expands to show description + suggested fix + proof + actions.

```
group header (clickable row):
  width: 100%
  padding: 1rem 0.25rem
  border-bottom: 1px solid var(--border-subtle)
  left side: severity dot (8px) + uppercase label (0.7rem, +0.08em letter-spacing) + count
  right side: chevron icon (rotates 90deg when open)

finding row (collapsed):
  padding: 0.75rem 0.875rem
  border-radius: 6px
  margin-bottom: 0.125rem
  background: transparent (default)  |  --surface-elevated (expanded)
  transition: background 120ms ease
  contents: chevron + title (0.95rem, primary) + file:line in monospace (0.78rem, tertiary)

finding row (expanded):
  same row above, plus indented body below:
  padding-left: 2.5rem (aligns with title)
  contains:
    - description (0.9rem, secondary, line-height 1.6)
    - "Suggested fix" callout (small label + body in a nested surface-main card with subtle border)
    - proof block (terminal | code excerpt | screenshot | side-by-side per the Proof Variety table)
    - action row: "Copy to Cursor" outline button (transitions to green text on success)
```

## Verdict Cinema (post-scan hero)

The page-1 share-card moment. Full-bleed section, vertically centered, max 70vh.

```
section:
  padding:        5rem 1.5rem 4rem
  background:     <gradient>, var(--surface-main)
                  -- gradient is one of the three Verdict Cinema gradients above
  border-bottom:  1px solid var(--border-subtle)

inner:            max-width: 56rem, centered, text-center

verdict pill:     status badge (see above) with severity icon (ShieldX/ShieldAlert/ShieldCheck, 12px)
                  text: "Do not ship" | "Ship with caution" | "Ready to ship"

headline:         clamp(1.75rem, 4vw, 2.75rem), -0.02em, line-height 1.15, weight 700, primary color
                  ONE sentence only. Generated by the LLM. Never templated.
                  Example: "3 critical breaches. Your /admin endpoint is open to the internet."

subhead:          1rem, secondary color, max-width: 36rem, line-height: 1.5
                  ONE additional sentence. Concrete proof or stake.
                  Example: "We accessed your user table in 3.2 seconds."

primary CTA:      btn-green, "Show me the breach →"
secondary link:   btn-ghost styled, "View full report"
```

# Execution precision (this is the real game)

Minimalism only works when the polish is extraordinary. Linear, Stripe, and Vercel feel calm because every detail is precise. If a button has a 1px misalignment, a hover transition that's 50ms too slow, a focus ring in the wrong color, an icon that doesn't share an x-axis with its label — the minimalism collapses into "empty," "lifeless," "generic." Execution is the entire game.

This section is the difference between **looking like Linear** and **looking like an AI-generated tribute to Linear.**

## Precision standards

- **Spacing** — every padding/margin/gap value is on the 4px scale. The only exception is hairline borders at 1px. No 13px, no 17px, no "I'll just adjust this by a couple pixels."
- **Alignment** — text baselines align across columns. Icon sizes match their adjacent text's x-height (not full cap-height — looks bottom-heavy). Buttons in a row share one y-axis. A 14px icon next to a 14px label sits 1px above center, not vertically-centered as the box.
- **Border consistency** — every border in the system is `1px solid var(--border-subtle)` or `1px solid var(--border-strong)`. No mixing widths. No dashed borders unless deliberate (and only for placeholder/drop zones).
- **Border-radius cascade** — nested elements use *smaller* radius than their parent: 12px parent → 8px child → 6px grandchild. Never reverse. A button inside a card should have less corner-curve than the card.
- **Tabular numbers** — anywhere numbers appear alongside other numbers (stats, prices, scan counts, percentages, scores), use `font-variant-numeric: tabular-nums` so digits line up vertically. Otherwise "1,247" and "39%" stacked vertically will look broken even though they shouldn't.
- **Optical sizing** — display headlines use negative letter-spacing (-0.04em). Body text uses normal tracking. Labels use +0.08em uppercase. This is the single biggest visual upgrade over "default styled" interfaces.

## Microinteraction quality

Microinteractions are the proof of polish. Skip them and the design feels empty; overdo them and it feels gimmicky. The line is "did this communicate state, or did it decorate?"

- **Counter-up animations** (stat numbers, vuln counts) animate from 0 → final value over **600-800ms with ease-out**. Never longer. Only on initial reveal; never on re-render.
- **Copy-to-clipboard** flips the button text to "Copied" with a color shift to `--green`, holds 2 seconds, reverts. No toast notification, no popover — just the button change.
- **Expand / collapse** animates `height: auto` smoothly via measured-height transition or `max-height` with `overflow: hidden`. **No spring physics** — straight ease-out.
- **Severity pill enters** with a 200ms scale-in (0.95 → 1.0) + fade. Only on initial mount of the result page.
- **Verdict Cinema reveal** when scan completes: fade up from `translateY(8px)` over 400ms with ease-out. Other content fades in 200ms after.
- **Tab switch** transitions only the active-state indicator (color, border-bottom). The tab content fades 120ms. Never slide-animate tab content — feels slow.

## What polish looks like in practice

| Sloppy | Polished |
|---|---|
| Button has 8px padding-top, 9px padding-bottom (off by 1px) | Both 9px (or both 8px) — pick the scale value and stick to it |
| Hover uses `transition: all 0.3s` | `transition: border-color 120ms ease-out, color 120ms ease-out` — specific properties, 120ms is the snappy default |
| Focus ring uses browser default (light blue, off-brand) | `outline: 2px solid var(--green); outline-offset: 2px` |
| Loading button shows a spinner | Loading button shows the step name with a 6px pulsing dot |
| Card hover scales up + shadows + glows + border changes | Card hover changes border color only |
| Numbers in stats are proportional-width (digits shift around) | `font-variant-numeric: tabular-nums` (digits stay put) |
| Section padding varies between 72px and 88px arbitrarily | Always 80px on desktop, always 56px on tablet, always 40px on mobile |
| Icons are vertically centered inside buttons via `align-items: center` | Icons sit on the same baseline as label text — fine-tune with `margin-top: 1px` if needed |

The rule: if you can see two near-identical UIs side-by-side and one is "obviously better," the difference is here. None of it is glamorous. All of it is the work.

# Page-level patterns

## Landing page sections (in order)

Greenlit's landing page is intentionally minimal — 5 sections, no more.

1. **Hero**
   - Vertically centered, 60vh minimum
   - Single H1 (display type)
   - One sub-headline (1rem, secondary)
   - Scan bar (the URL input + primary button)
   - 3 example-repo chips below (0.7rem mono, tertiary, single line)
   - Optional inline stat row: "1,247 apps scanned · 39% have criticals" (small, tertiary)
   - **No badge above the H1. No pulsing dots. No marketing fluff.**

2. **Proof of exploit** (the differentiator section)
   - Two-column split layout, max 56rem
   - Left column: H2 + 2 paragraphs of plain-English explanation
   - Right column: a terminal block showing the actual exploit
   - Tagline: *"We don't just find it. We prove it."*

3. **How it works** (max 3 steps, single horizontal row)
   - Numbered (01 / 02 / 03), label-style numerals
   - Title (1rem, primary, weight 600)
   - One-sentence description (0.85rem, secondary)
   - Hairline dividers between steps (no cards, no boxes)
   - Pure typographic flow

4. **Features** (max 4 cards in a 2×2 grid, NOT 6)
   - Each card: 16px lucide icon, title (1rem), one-sentence description (0.85rem)
   - One accent feature uses `--green-dim` background + `--green-border` to draw the eye
   - The four chosen features: **Proof of Exploit** (accent), **Plain-English Verdict**, **Continuous Monitoring**, **Auto-Fix PRs**

5. **Pricing** (3 tiers + currency band toggle)
   - Currency band toggle at top right (USD · INR · Emerging — Lucide Globe icon)
   - 3 tier cards: Free / Solo / Indie (Solo has "Most Popular" small badge top-center)
   - 4th item below as a callout strip: "$5 one-time scan" — for founders who won't subscribe
   - Tier feature lists use Lucide `<Check />` (size 12, --green, strokeWidth 2.5) for each line — NEVER unicode `✓`

6. **Final CTA**
   - Single sentence, single primary button, generous padding (100px vertical)
   - Max-width 28rem text
   - Example copy: *"Don't ship a public exploit. Run Greenlit first."*
   - Below button: small tertiary line listing 3 commitments separated by `·` — e.g., "No credit card · Public repos always free · Cancel anytime"

## Result page (post-scan) — three zones

See `specs/2026-05-13-product-redesign.md` §2.2-§2.4 for full specification. Summary:

- **Zone 1 — Verdict Cinema** (full hero, ~70vh, gradient by verdict status)
- **Zone 2 — Doctor's Report** (4-group nav: Breaches / About your app / Take action / History; each group has sub-tabs)
- **Zone 3 — Breach Proof** (terminal blocks inlined inside breach cards when severity ≥ high, mixed with code excerpts / screenshots / side-by-side per Proof Variety)

## Pricing page (separate route at `/pricing`)

- Hero: H1 + sub
- Currency band toggle (prominent, top of the comparison table)
- 3-tier comparison rendered as a **table**, not 3 cards (per rule 5)
- $5 one-time scan as a callout below the table
- FAQ section at the bottom (Accordion pattern — single panel open at a time)
- NO testimonials section (we don't have real ones yet — rule 8)

## Dashboard page (authenticated — workspace mode)

This page is **operational**, not narrative. Rule-6 exception applies — multiple peer actions are appropriate.

- Top: page H1 "Your monitored repos" + secondary action ("Add repo") as a peer button
- Stats row (3 stat pills max, not 6): repos tracked / total scans this month / critical issues open
- Repo grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- Each repo card: name + last scan score + last scan timestamp + monitoring toggle + small CTA "View report"
- Empty state: "Connect a repo to start monitoring. We scan every push."

# Interaction philosophy

The visual philosophy answers *"what does it look like?"* This section answers *"what does it feel like to use?"* Visual is necessary. Interaction is what makes a product feel alive instead of dead.

## Motion philosophy

**Default duration:** 120-200ms. Faster feels jittery. Slower feels broken.

**Specific timings — use these exact values:**

| Interaction | Duration | Easing |
|---|---|---|
| Hover state change | **120ms** | `ease-out` |
| Active / pressed state | **80ms** | `ease-out` |
| Tab switch (color/border change) | **120ms** | `ease-out` |
| Expand / collapse | **200ms** | `ease-out` |
| Modal open | **150ms** | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Modal close | **120ms** | `ease-in` |
| Page initial mount fade-in | **200ms** | `ease-out` |
| Counter animation (number tick-up) | **600-800ms** | `ease-out` |
| Loading dot pulse | **1.4s** | `ease-in-out`, infinite |

**Rules:**
- Animate **specific properties**, never `transition: all`. (Slower, less precise, breaks intent on unrelated property changes.)
- **Never animate to draw attention.** Animation communicates state change, never decorates. If the user wouldn't miss the state change without it, you don't need it.
- **No spring physics** (bouncy `cubic-bezier`) unless deliberate — drag-to-reorder is the only place we sanction them.
- **Respect `prefers-reduced-motion`.** Disable non-essential animations when the user has it set. The verdict cinema reveal becomes an instant render; expand/collapse becomes instant; counter animations skip to the final value.

## Hover philosophy

**Every interactive element gets a hover state.** Even ghost buttons. Even text links. The hover confirms *"yes, you can click this."*

**Subtle, not flashy — change one thing, never three:**

| Element | Hover treatment |
|---|---|
| Primary button | `scale(1.02)` + 4px green outer ring at 15% opacity |
| Outline button | `border-color: var(--border-strong)` + color shifts secondary → primary |
| Ghost button | `background: rgba(255,255,255,0.03)` |
| Clickable card | `border-color: var(--border-strong)` |
| Text link | `color` shifts secondary → primary (or underline appears — pick one per route) |
| Icon button | 40px circle background appears at `rgba(255,255,255,0.04)` |
| Severity pill | NO hover — pills are status, not actions |
| Nav tab (inactive) | `color` shifts; underline border stays. Only the active tab has the green border. |

**Rules:**
- Hover changes **one** thing, never three. Border OR color OR background — not all three at once.
- **NEVER hover-jump position.** No margin/padding shifts that move the element on hover (causes layout jank, feels broken).
- Hover transition must match the active-state transition so going `hover → active → hover` doesn't flicker.

## Transition philosophy

Three transition categories:

1. **State transitions** (hover, focus, active, expanded/collapsed) — 120-200ms, ease-out, specific properties only.
2. **Content transitions** (route changes, tab switches) — 200ms fade-up by 8px. **No slide animations.** Slide-in/slide-out tab content feels slow and dated.
3. **Modal / overlay transitions** — 150ms scale-in (0.95 → 1.0) + fade. Backdrop fades 200ms. Esc closes with 120ms ease-in.

**Page enter animation:** Use a single `animate-in` keyframe applied once on initial mount. Stagger child animations with `animation-delay` increments of 50ms. **Cap stagger at 200ms total** — anything longer feels artificially slow.

**Page exit:** Skip exit animations on route changes. Next.js handles routing transitions natively; adding ours on top causes double-fade.

## Keyboard navigation philosophy

**The keyboard test:** can a power user complete the most common flow (paste URL → see verdict → click "Show me the breach" → expand a finding → copy fix) without ever touching the mouse?

If yes, you have built a keyboard-first product. If no, the keyboard is an afterthought.

**Rules:**

- **Every interactive element is in the Tab order.** Use `<button>` and `<a>`, not `<div onClick>`. The native elements give you focus, keyboard activation, and screen-reader semantics for free.
- **Focus rings are visible.** `outline: 2px solid var(--green); outline-offset: 2px`. **Never `outline: none`** without a styled replacement.
- **Skip links** at the top of every page: "Skip to results" jumps past the nav. Visually hidden until focused.
- **Tab order is meaningful.** Logo → main nav → primary action → secondary nav → content → footer. Never random, never depending on DOM order accidentally.

**Greenlit keyboard shortcuts:**

| Shortcut | Action |
|---|---|
| `Cmd / Ctrl + K` | Open scan input from any page |
| `Esc` | Close modals; collapse expanded findings; clear focused input |
| `Enter` (on result page) | Expand the first critical finding |
| `Arrow up / down` | Navigate within a vulnerability list |
| `/` | Focus the search / scan input where one exists |

**Tab nav follows WAI-ARIA tablist:** arrow keys navigate within the tab group, Tab leaves the group. Active tab is `aria-selected="true"`.

## Error-state philosophy

**Recovery-first language. Never blame the user.**

| Error type | Sloppy copy | Greenlit copy |
|---|---|---|
| Network failure | "Network error" | "Lost connection. Retry." |
| Invalid URL | "Invalid input" | "URL must start with `https://github.com/`" |
| Auth expired | "Unauthorized" | "Sign in again to continue." |
| Server error | "500 Internal Server Error" | "Something broke on our end. Try again in a minute." |
| Rate limit (free tier) | "429 Too Many Requests" | "You've used 3 scans today on the free tier. Resets at midnight UTC, or upgrade for unlimited." |
| Repo not found | "404" | "Greenlit couldn't reach this repo. Is it public?" |
| Repo too large | "Payload too large" | "This repo is over 200K LoC. Greenlit caps scans at 200K — try a subdirectory." |

**Visual treatment:**

- **Hard errors** (cannot proceed) use `--status-critical`. Soft errors (can retry) use `--status-medium`.
- **Inline errors** appear directly below the input/action that caused them. Never as toasts/modals unless the error is route-blocking.
- **Hard errors get a small `AlertTriangle` lucide icon** (size 14, status color), inline before the text.
- **Every error includes a specific next action** — a Retry button, an Upgrade link, or an explanation of what to fix.

**Anti-patterns:**

- Generic "Something went wrong" with no detail.
- Stack traces in production.
- Error codes without explanation.
- "Please try again" with no Retry button.
- Toasts that disappear before the user can read them.

## Responsiveness philosophy

**Breakpoints (mobile-first):**

```
default       0px      design for this first
sm            640px    larger phones, landscape
md            768px    tablets
lg            1024px   small desktop
xl            1280px   standard desktop (max-width: 80rem caps here)
```

**Mobile-first thinking:**

- **Design every component for 320px width first.** Stack everything single-column at default.
- **Multi-column grids only kick in at `md` (768px)** minimum — sometimes `lg`. Never on mobile.
- **The 4-group result page nav becomes horizontal scroll** on mobile (overflow-x: auto, scroll-snap on each tab).
- **Sub-tab nav becomes a `<select>` dropdown** on mobile if there are >4 sub-tabs. Otherwise horizontal scroll.

**Touch targets:**

- Minimum **44px tall** on mobile for any tappable element.
- Adjacent tap targets have **≥ 8px spacing** to prevent fat-finger mis-taps.
- Increase button vertical padding from 9px (desktop) to **12px (mobile)** to hit the 44px minimum.

**Density adaptation:**

- **Pricing tables collapse to stacked tiers on mobile** — each tier becomes a full-width card. The comparison table format only works at `md`+.
- **Verdict Cinema headline** scales via `clamp()` (already in tokens).
- **Tables collapse to stacked key-value rows on mobile** — never horizontal scroll for tables. Each row becomes: `<label>: <value>` in two lines.
- **Cards reduce padding** from `1.5rem` (desktop) to `1rem` (mobile).
- **Section vertical padding** drops from `80px` → `56px` → `40px` per breakpoint.

**Test breakpoints:** 320px (worst case), 375px (iPhone SE), 414px (iPhone 14 Plus), 768px (iPad), 1280px (laptop). If it works at these five, it works everywhere.

# Anti-patterns (do NOT generate these)

- Testimonial sections with stock photos and made-up names
- Multiple accent colors (purple + green + cyan = vibe-coder dashboard energy)
- An icon next to every text element — decorative icons. Only use icons when they convey status or function.
- Animated gradients, parallax effects, scroll-jacking
- Headlines longer than one sentence
- 6+ feature cards (max is 4 — if you need more, reconsider what's actually a feature)
- Stat grids with 6+ numbers in colored cards (the specific slop signal Greenlit removed)
- Pricing in 3 currencies on the same row simultaneously — use a toggle
- Any use of: "powerful," "amazing," "revolutionary," "next-gen," "world-class," "AI-powered" (as a marketing claim)
- Marketing copy that sounds like a Lovable-generated landing page
- Spring-physics animations on UI state changes (only valid for drag-to-reorder)
- Hover states that move the element's position (causes layout jank)
- `transition: all` — always animate specific properties
- Browser-default focus rings (light blue, off-brand)
- Toast notifications that close before they're read (or that appear when an inline message would be better)
- "Please try again" with no Retry button
- Generic "Something went wrong" with no recovery path
- Horizontal scroll on tables (collapse to stacked rows on mobile instead)

# Reference products (study these — they share Greenlit's design DNA)

| Product | What to learn |
|---|---|
| **linear.app** | Dark theme, monochrome + one accent, generous whitespace, tight type, restraint, microinteraction polish |
| **stripe.com / Stripe Dashboard** | Clinical precision, table-driven layouts, no decorative fluff, confident silence, error-state quality |
| **vercel.com** | Minimal, geometric, single accent (white on black), enough whitespace to breathe |
| **haveibeenpwned.com** | Dramatic-but-simple, single-page, undeniable single-claim presentation |
| **observatory.mozilla.org** | Security tooling done with calm — letter grades, no marketing fluff |
| **railway.app** | Pricing page done right — single comparison table, no card grid |
| **raycast.com** | Keyboard-first product design, command palette pattern (informs our Cmd+K) |
| **arc.net** | Motion philosophy done well — every animation serves communication, none decorate |

Anti-references (do NOT study or imitate these):
- Anything from a Web3 / crypto landing page library
- "AI-powered" marketing sites from 2024 (gradient hero + 6 stat cards + 3 testimonials = the slop pattern)
- Lovable / Bolt template landings (we are the antidote, not a copy)

══════════════════════════════════════════════════════════════════════════════

# YOUR REQUEST

Append below this line when using the prompt:

```
Design: ____________________________________________________________
Constraints: _______________________________________________________
Deliverable: _______________________________________________________
```

# Examples of well-formed requests

### Request 1 — Whole landing page

```
Design: The complete Greenlit landing page following the 6-section structure
defined above (Hero, Proof of Exploit, How It Works, Features, Pricing, Final CTA).

Constraints: All 10 no-AI-slop rules must hold (with the rule-6 exception flagged
if Dashboard-style action clusters appear anywhere). Use only the color tokens
defined. Every color reference goes through var(--token-name) — no inline hex.
Must work at 320px wide on mobile. Pricing tier prices: Free / Solo $7 / Indie
$29 with "$5 one-time scan" callout. Features grid is 4 cards. All interactions
follow the motion philosophy (120-200ms, specific properties, ease-out).

Deliverable: Single Next.js 16 page component ("use client") with inline
styles + the existing CSS vars. No new CSS files. Self-contained.
```

### Request 2 — One component

```
Design: A "ScanProgress" loading component that animates through 5 steps
(Cloning your repo · Reading your code · Attacking your live URL · Comparing
to 10,000+ apps · Writing your report).

Constraints: Must follow the step-indicator spec above. Steps light up
sequentially with step-duration estimates totaling ~60 seconds. The active
step shows a lucide Loader2 spinning; completed steps show lucide Check.
Empty step is an 8px gray dot. All transitions per motion philosophy.
Respect prefers-reduced-motion.

Deliverable: React component file, "use client", inline styles. TypeScript.
Accepts one prop: repoLabel (string, the repo name to display above the steps).
```

### Request 3 — Pricing page

```
Design: The /pricing page. Three tiers (Free, Solo $7, Indie $29) plus a
$5 one-time scan callout. Currency band toggle at top right (USD · INR ·
Emerging). FAQ section below the table with 5 entries (Accordion, only one
open at a time).

Constraints: Comparison is a TABLE, not 3 cards (per rule 5). On mobile,
the table collapses to stacked tier cards per the responsiveness rules.
"Most Popular" badge above Solo column. Free row is the first column,
Indie the last, Solo (highlighted) the middle. Currency band toggle updates
all prices inline without a page reload. No testimonials.

Deliverable: Next.js 16 page at /pricing as a self-contained component
with inline styles.
```
