# Product Requirements Document: Model Council

**Author**: Abbas
**Date**: 2026-04-14
**Status**: Draft
**Version**: 1.0

---

## 1. Executive Summary

Model Council is a console application that sends any user prompt to multiple AI models simultaneously, has them debate each other across structured rounds, and produces a final consensus answer alongside an agreement/disagreement table. It is built as a cheap, open alternative to Perplexity's multi-model feature — using OpenRouter as a unified, pay-per-token backend to keep costs low for researchers, developers, business users, and anyone who needs a second (and third, and fourth) opinion.

---

## 2. Background & Context

**The problem**: Getting multiple AI perspectives on a research question, decision, or creative brief currently requires either:
- Manually copy-pasting the same prompt into 4 different AI tools (slow, tedious, no synthesis)
- Subscribing to Perplexity Pro ($20+/month) which offers multi-model comparison but is expensive for casual users

**Why now**: OpenRouter (openrouter.ai) now aggregates Claude, GPT-4/5, Gemini, and Grok under a single API key with pay-per-token pricing — making it technically trivial to build a multi-model orchestration layer at a fraction of the cost of managed tools.

**The opportunity**: No open, cheap, self-hostable tool exists that orchestrates a structured *debate* between models — not just parallel answers, but models that read each other's responses, push back, and converge on a consensus. This is the gap Model Council fills.

---

## 3. Objectives & Success Metrics

### Goals
1. A user can submit one prompt and receive structured debate output from 4 models in under 30 seconds
2. The final output includes a human-readable consensus answer AND a structured agreement/disagreement table
3. Cost per query is transparent and stays under $0.05 for a standard 3-round debate
4. The app is runnable locally with a single command and a user's own OpenRouter API key

### Non-Goals
1. **Not a web app (Phase 1)** — console/CLI only; UI comes later
2. **Not real-time streaming UI** — batch responses per round, not token-by-token streaming
3. **Not storing conversation history** — stateless per session in Phase 1
4. **Not fine-tuning or training models** — purely inference orchestration
5. **Not building our own model** — OpenRouter-only in Phase 1

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Time to first debate output | N/A | < 30s per query | Measured locally |
| Cost per 2-round debate | N/A | < $0.10 | OpenRouter usage logs |
| Models available | 0 | 4 (Claude, GPT-4/5, Gemini, Grok) | OpenRouter model list |
| Agreement table accuracy | N/A | Correct extraction on 8/10 manual test prompts | Manual QA |
| Setup time (new user) | N/A | < 5 min from clone to first query | Timed test |

---

## 4. Target Users & Segments

### Primary: Independent Researchers & Students
- Need multi-perspective analysis for papers, reports, decisions
- Can't afford or don't want Perplexity subscription
- Comfortable with CLI tools
- Current workaround: manually querying multiple chatbots

### Secondary: Developers & Builders
- Want to integrate multi-model debate into their own apps
- Will use Model Council as a library or API wrapper
- Will contribute to the open-source repo

### Tertiary: Business Users & Decision Makers
- Need structured reasoning for high-stakes decisions (hiring, strategy, investments)
- Value the agreement/disagreement table as a decision-support artifact
- Less CLI-comfortable — will need a web UI eventually (Phase 2)

---

## 5. User Stories & Requirements

### P0 — Must Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P0-1 | As a user, I want to submit a prompt and receive responses from 4 models in parallel, so I don't wait for them sequentially | All 4 models called async simultaneously; total wait ≈ slowest single model, not sum of all |
| P0-2 | As a user, I want each model assigned a debate role (Devil's Advocate, Optimist, Analyst, Creative) so responses are structured and differentiated | System prompt for each model includes its role; role visibly labelled in output |
| P0-3 | As a user, I want models to debate across at least 2 rounds, where Round 2 responses reference Round 1 outputs | Round 2 prompt includes all Round 1 responses as context; models explicitly asked to respond to each other |
| P0-4 | As a user, I want a final consensus answer synthesised from all rounds, so I get one clear takeaway | A 5th "judge" LLM call synthesises all rounds into 2-3 paragraph consensus |
| P0-5 | As a user, I want an agreement/disagreement table so I can see at a glance where models aligned or diverged | Judge call extracts structured JSON of agree/disagree per model per key point; rendered as markdown table |
| P0-6 | As a user, I want to provide my own OpenRouter API key via `.env`, so I control my own costs | App reads `OPENROUTER_API_KEY` from `.env`; fails gracefully with clear error if missing |
| P0-7 | As a user, I want to see the token cost of each query after it completes | OpenRouter usage response parsed; cost displayed per model and total at end of output |

### P1 — Should Have

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P1-1 | As a user, I want to configure which models to include via a config file, so I can swap models without changing code | `config.json` or `.env` lists model IDs; app reads at startup |
| P1-2 | As a user, I want to export the full debate + consensus as a Markdown file, so I can use it in reports | `--export` flag saves output to `./output/[timestamp].md` |
| P1-3 | As a user, I want to choose between 1, 2, or 3 debate rounds via a CLI flag, so I can trade depth for cost | `--rounds 1|2|3` flag; default is 2 |
| P1-4 | As a user, I want clear error messages if a model call fails, so the whole query doesn't silently break | Failed model calls caught individually; app continues with remaining models and flags which failed |

### P2 — Nice to Have / Future

| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| P2-1 | As a user, I want a web UI to submit prompts and read debates, so non-CLI users can access it | Phase 2 scope |
| P2-2 | As a user, I want prompt templates (Research / Decision / Creative) pre-loaded, so I don't write prompts from scratch | Template selector at startup |
| P2-3 | As a user, I want debate history saved locally, so I can revisit past queries | SQLite or flat-file session store |
| P2-4 | As a developer, I want a REST API wrapper, so I can call Model Council from other apps | Phase 2 scope |

---

## 6. Solution Overview

### Architecture

```
User Prompt (CLI)
      │
      ▼
┌─────────────────────────────────────┐
│         Orchestrator                │
│  - Assigns roles to models          │
│  - Manages round loop               │
│  - Aggregates responses             │
└──────────┬──────────────────────────┘
           │ async parallel (Round 1)
    ┌──────┴───────────────────────┐
    │                              │
  Claude             GPT-4/5     Gemini    Grok
(Devil's Advocate) (Optimist)  (Analyst) (Creative)
    │                              │
    └──────────────────────────────┘
           │ responses fed back in (Round 2)
    ┌──────┴──────────────────────────┐
    │   Same 4 models, now with       │
    │   Round 1 context in prompt     │
    └──────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  Judge LLM   │  (5th call — cheap model e.g. claude-haiku)
    │  - Consensus │
    │  - JSON diff │
    └──────────────┘
           │
           ▼
    Terminal Output + Optional .md export
```

### Key Design Decisions

1. **OpenRouter as unified backend** — single API key, model-agnostic, easy to add/remove models via config
2. **Async parallel calls** — all 4 models called simultaneously per round; total latency = slowest model, not sum
3. **Judge LLM is a cheap model** — use `claude-haiku` or `gpt-4o-mini` for synthesis to keep costs low
4. **Roles via system prompt** — no fine-tuning; roles injected as system-level instructions per model
5. **Agreement extraction via structured JSON** — judge outputs `{ "points": [{ "topic": "...", "claude": "agree", "gpt": "disagree", ... }] }` parsed into table

### Confirmed Model Lineup (via OpenRouter)

| Role | Model | OpenRouter ID | Input | Output | Context |
|------|-------|--------------|-------|--------|---------|
| Devil's Advocate | Claude Sonnet 4.6 | `anthropic/claude-sonnet-4.6` | $3/M | $15/M | 1M tokens |
| Optimist | GPT-5 | `openai/gpt-5` | $1.25/M | $10/M | 400K tokens |
| Analyst | Gemini 2.5 Pro | `google/gemini-2.5-pro` | $1.25/M | $10/M | 1M tokens |
| Creative | Grok 4 Fast | `x-ai/grok-4-fast` | $0.20/M | $0.50/M | 2M tokens |
| Judge (synthesis) | Grok 4 Fast | `x-ai/grok-4-fast` | $0.20/M | $0.50/M | 2M tokens |

**Estimated cost per 2-round debate**: ~$0.08–$0.10 (GPT-5 is a reasoning model — uses ~1,500 internal reasoning tokens per call billed at output rates)
- Round 1: 4 models parallel = ~$0.040 (GPT-5 dominates at ~$0.020 alone)
- Round 2: 4 models parallel = ~$0.040
- Judge call (Grok 4 Fast): ~$0.001

### Tech Stack
- **Runtime**: Node.js (TypeScript) ✅
- **API**: OpenRouter (`https://openrouter.ai/api/v1`) — OpenAI-compatible SDK
- **Config**: `.env` for API key, `config.json` for model list and roles
- **Output**: Terminal (chalk/rich for formatting) + optional Markdown file

---

## 7. Open Questions

| Question | Owner | Deadline |
|----------|-------|----------|
| ~~Is GPT-5 available on OpenRouter?~~ **Confirmed** `openai/gpt-5` ✅ | — | — |
| ~~Is Grok available on OpenRouter?~~ **Confirmed** `x-ai/grok-4-fast` ✅ | — | — |
| ~~Is Claude available on OpenRouter?~~ **Confirmed** `anthropic/claude-sonnet-4.6` ✅ | — | — |
| ~~Which Gemini model?~~ **Confirmed** `google/gemini-2.5-pro` ✅ | — | — |
| Preferred language: TypeScript (Node) or Python? | Abbas | Before dev starts |
| Should the judge LLM be configurable, or hardcoded to cheapest available? | Abbas | Sprint 1 |
| What's the monetization model — hosted SaaS, open-source + Pro tier, API credits? | Abbas | Before Phase 2 |

---

## 8. Timeline & Phasing

### Phase 1 — MVP Console App (current scope)
- OpenRouter integration + 4 model calls
- Role assignment via system prompts
- 2-round debate loop
- Judge LLM for consensus + agreement JSON
- Agreement/disagreement table in terminal output
- Cost display per query
- `--export` flag for Markdown output

### Phase 2 — Web UI + API
- React/Next.js frontend with live debate view
- REST API wrapper for third-party integrations
- Prompt templates library (Research / Decision / Creative)
- User accounts + debate history

#### Phase 2 Design System — "Modern Atmospheric"
Source: [superdesign.dev](https://app.superdesign.dev/)

**Visual Language**
- Base background: `#0f172a` (deep slate) for debate view and hero
- Brand accent: `#6366f1` (indigo) for active model highlights, CTAs, agreement indicators
- Surface: `#f8f9fa` for feature/settings sections
- Border: `rgba(255,255,255,0.1)` throughout
- Glow effect: `radial-gradient(indigo → purple → pink)` at `blur(20px), opacity(0.3)` on interactive elements

**Typography**
- Headlines/Hero: `Lora` (serif), weight 400–700, tracking-tight, line-height 1.1
- UI/Body/Debate content: `Inter`, weight 400–600, line-height relaxed
- Model names, token counts, cost, round labels: `Space Grotesk`, tracking-tight

**Glassmorphism — Model Response Cards**
- Soft (default): `background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1)`
- Strong (active/focused card): `background: rgba(30,41,59,0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 30px rgba(0,0,0,0.1)`

**Key Components mapped to Model Council**

| Component | Model Council Use |
|---|---|
| **Vibe Input Box** | Primary prompt input — white container, `rounded-2xl`, multi-color glow intensifies on hover, borderless textarea, send button |
| **Glass panels** | One panel per model response (Devil's Advocate, Optimist, Analyst, Creative) |
| **Sticky Feature Nav** | Left sidebar: Round 1 → Round 2 → Round 3 → Consensus scroll-spy |
| **Typing cursor animation** | Hero subheading: "Ask anything. Let the council decide." |
| **Grid overlay** | Subtle 1px grid texture behind the debate panel area |
| **Indigo badge** | "New" tag → round label e.g. `Round 2` or `Consensus` |

**Layout Adaptation for Model Council**

```
[Hero — #0f172a, 100vh]
  Small indigo badge: "AI Council"
  Lora headline: "Ask once. Hear from everyone."
  Vibe Input Box (prompt entry + send)
  Subheading with typing cursor: "Research · Decisions · Creative Work"

[Debate View — #0f172a]
  Sticky left nav: Round 1 | Round 2 | Consensus
  4× Glass panels (model responses) in 2-col grid
  Agreement/Disagreement Table (indigo highlights for agree, muted red for disagree)
  Cost summary bar (Space Grotesk, monospace-feel)

[How It Works — #f8f9fa]
  Feature scroll-spy section (2-col alternating: text vs visual)
  Code snippet blocks showing the debate architecture

[Footer — #0f172a]
  Brand + tagline | Links | Contact
```

**Do NOT use from this design system:**
- Integration bar with framework logos (not applicable)
- Testimonials masonry (Phase 3 if needed)
- FAQ accordion (optional, only if adding a landing page)

### Phase 3 — Monetization
- Hosted version with usage-based billing
- Free tier (N queries/day with rate limits)
- Pro tier (unlimited, priority routing, faster models)
- API access tier for developers
