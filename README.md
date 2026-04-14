# Model Council

**Ask once. Let the council decide.**

Four AI models are assigned distinct debate roles, argue your question across multiple rounds via [OpenRouter](https://openrouter.ai), and converge on a final consensus — complete with an agreement/disagreement matrix and transparent per-query cost.

![Model Council Web UI](https://raw.githubusercontent.com/placeholder/model-council/main/docs/preview.png)

---

## What it does

You submit a prompt. Four models debate it:

| Role | Model | Personality |
|------|-------|-------------|
| 👹 Devil's Advocate | Claude Sonnet 4.6 | Challenges every assumption |
| ✨ Optimist | GPT-5 | Finds the upside in anything |
| 🔍 Analyst | Gemini 2.5 Pro | Data-driven, systematic |
| 💡 Creative | Grok 4 Fast | Lateral thinking, novel angles |

Round 1: each model answers independently. Round 2+: each model reads the others' responses and pushes back. A fifth judge call (Grok 4 Fast) synthesises the debate into a consensus verdict and extracts an agreement matrix showing where models aligned or diverged.

**Total cost per query: ~$0.08–0.12 depending on rounds.**

---

## Stack

```
model-council/
├── src/          TypeScript CLI (tsx, yargs, openai SDK)
└── web/          Next.js 16 web UI (React 19, Tailwind v4, SSE streaming)
```

Both use the same `config.json` model registry and share the OpenRouter key via `.env`.

---

## Quickstart

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key with credits

### 1. Clone and install

```bash
git clone https://github.com/your-username/model-council.git
cd model-council

# CLI dependencies
npm install

# Web UI dependencies
cd web && npm install && cd ..
```

### 2. Set your API key

```bash
cp .env.example .env
# Edit .env and add your OpenRouter key:
# OPENROUTER_API_KEY=sk-or-...
```

For the web UI, the key is read from `web/.env.local`:

```bash
echo "OPENROUTER_API_KEY=sk-or-..." > web/.env.local
```

### 3. Run

**CLI:**

```bash
npm run dev -- "Should I build a startup or join big tech?" --rounds 2
```

With Markdown export:

```bash
npm run dev -- "Is remote work better than office work?" --rounds 3 --output
# Saves to ./output/[timestamp].md
```

**Web UI:**

```bash
cd web && npm run dev
# Open http://localhost:3000
```

---

## CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--rounds 1\|2\|3` | `2` | Number of debate rounds |
| `--output` | off | Save full debate to `./output/[timestamp].md` |

---

## Configuration

`config.json` controls the model lineup, roles, system prompts, and cost rates. Swap any model for any OpenRouter-supported model by changing the `id` field.

```json
{
  "council": [
    {
      "id": "anthropic/claude-sonnet-4.6",
      "role": "Devil's Advocate",
      "inputCostPerM": 3.00,
      "outputCostPerM": 15.00,
      "systemPrompt": "..."
    }
  ],
  "judge": {
    "id": "x-ai/grok-4-fast"
  },
  "defaults": {
    "rounds": 2,
    "maxTokensPerModel": 600
  }
}
```

---

## Architecture

```
User prompt
    │
    ▼
┌─────────────────────────────────────────┐
│  Round 1: 4 parallel OpenRouter calls   │
│  Each model answers independently       │
└─────────────────────────────────────────┘
    │
    ▼ (if rounds > 1)
┌─────────────────────────────────────────┐
│  Round N: 4 parallel calls              │
│  Each prompt includes all prior rounds  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  Judge call (Grok 4 Fast)               │
│  Synthesises consensus + agreement JSON │
└─────────────────────────────────────────┘
    │
    ▼
Consensus verdict + agreement matrix + cost breakdown
```

The web UI uses **Server-Sent Events (SSE)** to stream each model response as it arrives, so you see the debate build in real time rather than waiting for all four models to finish.

---

## Project structure

```
model-council/
├── config.json              Model registry (roles, costs, system prompts)
├── .env.example             API key template
├── src/
│   ├── index.ts             CLI entry point (yargs)
│   ├── council.ts           Core debate orchestrator
│   ├── client.ts            OpenRouter client (openai SDK)
│   ├── display.ts           Terminal output + Markdown export
│   └── types.ts             Shared TypeScript interfaces
├── web/
│   ├── app/
│   │   ├── page.tsx         Landing page + prompt input
│   │   ├── layout.tsx       Root layout
│   │   ├── globals.css      Design system (glassmorphism, fonts)
│   │   └── api/debate/      SSE streaming endpoint
│   ├── components/
│   │   ├── DebateView.tsx   Live debate orchestrator
│   │   ├── ModelCard.tsx    Per-model glass panel
│   │   ├── AgreementTable.tsx  Agreement/disagreement matrix
│   │   ├── CostSummary.tsx  Token usage + cost breakdown
│   │   └── Nav.tsx          Fixed navigation bar
│   └── lib/
│       ├── council.ts       Server-side debate runner (async generator)
│       └── types.ts         Shared SSE event types
└── output/                  Markdown exports (gitignored)
```

---

## Roadmap

- [x] Phase 1 — TypeScript CLI with multi-round debate, judge synthesis, cost display, Markdown export
- [x] Phase 2 — Next.js web UI with SSE streaming, glassmorphism design, agreement matrix
- [ ] Phase 3 — Shareable debate links, debate history, user accounts

---

## License

MIT
