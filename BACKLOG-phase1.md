# Backlog: Model Council — Phase 1 (CLI MVP)

**Format**: Why-What-Acceptance (WWA)
**Total stories**: 12
**Priority split**: 8 × P0, 4 × P1
**Estimated total effort**: ~8-10 days solo

---

## P0 Stories — Must Have

---

### Story 1: Project Scaffold & OpenRouter Client

**Why:** Every subsequent story depends on a working TypeScript project and a reusable OpenRouter API client. Without this foundation nothing else is buildable.

**What:** Initialise the Node.js/TypeScript project. Create an `OpenRouterClient` class that wraps the OpenAI-compatible SDK pointed at `https://openrouter.ai/api/v1`. Load `OPENROUTER_API_KEY` from `.env`. Fail fast with a clear error message if the key is missing.

**Acceptance Criteria:**
- [ ] `npm install` + `npm run dev` runs without errors
- [ ] `OpenRouterClient` makes a real completion call to any OpenRouter model and returns a response
- [ ] Missing or invalid API key prints `Error: OPENROUTER_API_KEY not set in .env` and exits with code 1
- [ ] `tsconfig.json` configured with strict mode; `npm run build` produces zero TypeScript errors

**Priority:** P0 | **Effort:** S | **Dependencies:** none

---

### Story 2: Model Registry via config.json

**Why:** Models must be configurable without code changes so users can swap, add, or remove models freely. Hardcoding model IDs into business logic creates brittle coupling.

**What:** Create `config.json` at project root defining the 4 council models and the judge model. Each entry includes `id` (OpenRouter model ID), `role` (display name), and `systemPrompt` (role instruction). The app reads this file at startup.

**Acceptance Criteria:**
- [ ] `config.json` contains all 5 model entries: `anthropic/claude-sonnet-4.6`, `openai/gpt-5`, `google/gemini-2.5-pro`, `x-ai/grok-4-fast` (×2 for Creative + Judge)
- [ ] Removing a model from `config.json` reduces the council to 3 models without code changes
- [ ] Adding an unsupported model ID surfaces an error from OpenRouter, not a silent failure
- [ ] Config is typed — a `ModelConfig` TypeScript interface validates the shape at load time

**Priority:** P0 | **Effort:** S | **Dependencies:** Story 1

---

### Story 3: Role Assignment via System Prompts

**Why:** Differentiated roles are the core mechanic that makes Model Council a debate rather than 4 parallel answers. Without distinct personas the outputs are redundant.

**What:** Each model receives a tailored system prompt injecting its assigned role before any user content. Roles: **Devil's Advocate** (challenge every assumption), **Optimist** (find opportunities and best-case outcomes), **Analyst** (data-driven, structured reasoning), **Creative** (unconventional angles and lateral thinking).

**Acceptance Criteria:**
- [ ] Each model's API call includes a `system` message with its role description before the user prompt
- [ ] Role name is visible in terminal output above each model's response (e.g. `[Devil's Advocate — Claude Sonnet 4.6]`)
- [ ] System prompts are defined in `config.json`, not hardcoded in business logic
- [ ] Changing a system prompt in `config.json` changes the model's behaviour without touching source code

**Priority:** P0 | **Effort:** S | **Dependencies:** Story 2

---

### Story 4: Async Parallel Model Calls (Round 1)

**Why:** Sequential calls would make a 4-model debate take 4× longer. Parallel execution means total wait time equals the slowest single model — critical for a usable experience.

**What:** Use `Promise.allSettled()` to fire all 4 council model calls simultaneously in Round 1. Each call is independent. Collect all responses (fulfilled or rejected) before proceeding. Display responses as they arrive using a loading indicator per model.

**Acceptance Criteria:**
- [ ] All 4 model calls are fired in the same event loop tick (verified via timestamp logging in dev mode)
- [ ] Total Round 1 time ≤ slowest individual model response + 500ms overhead
- [ ] A per-model spinner shows `[waiting...]` until that model responds, then shows its output
- [ ] If one model fails, the remaining 3 responses are still collected and used — failure is logged but does not abort the round

**Priority:** P0 | **Effort:** M | **Dependencies:** Story 3

---

### Story 5: Multi-Round Debate Loop

**Why:** A single round of parallel answers is no different from opening 4 browser tabs. The debate loop — where models read and respond to each other — is what creates genuine synthesis and is the product's primary differentiator.

**What:** After Round 1, construct a Round 2 prompt that includes all Round 1 responses as context. Each model is instructed to read the other models' responses and either defend, revise, or challenge its initial position. Support configurable round count (default: 2). Each model is called in parallel again per round.

**Acceptance Criteria:**
- [ ] Round 2 system prompt explicitly references the other models' Round 1 responses
- [ ] Round 2 responses are visibly different from Round 1 (models acknowledge prior responses)
- [ ] Default is 2 rounds; configurable via `--rounds` flag (Story 9)
- [ ] Terminal output clearly labels each round: `=== Round 1 ===`, `=== Round 2 ===`
- [ ] Total token count grows predictably with each round (Round 2 input includes Round 1 output)

**Priority:** P0 | **Effort:** M | **Dependencies:** Story 4

---

### Story 6: Judge LLM — Consensus Synthesis

**Why:** Raw debate output is valuable but overwhelming. Users need a single distilled answer they can act on. The judge call transforms 8+ model responses into one clear verdict.

**What:** After all debate rounds complete, make a final call to `x-ai/grok-4-fast` (Judge role) with all round responses as input. The judge is instructed to synthesise a 2-3 paragraph consensus answer that incorporates the strongest points from all models.

**Acceptance Criteria:**
- [ ] Judge call fires only after all debate rounds are complete
- [ ] Judge output is clearly labelled `=== Final Consensus ===` in terminal output
- [ ] Consensus is 2-3 paragraphs and references at least 2 of the 4 council models by role name
- [ ] Judge uses `x-ai/grok-4-fast` (cheapest model) to minimise per-query cost
- [ ] Judge call failure surfaces a clear error but does not discard the debate output

**Priority:** P0 | **Effort:** M | **Dependencies:** Story 5

---

### Story 7: Agreement / Disagreement Table

**Why:** The heatmap table is the primary visual differentiator vs. just reading 4 responses. It lets users instantly see where models aligned and where genuine disagreement exists — critical for research and decision-making use cases.

**What:** Extend the judge prompt to also output a structured JSON block alongside the consensus text. The JSON lists 3-5 key debate points and each model's position (`agree` / `disagree` / `neutral`) on each point. Parse this JSON and render it as a formatted Markdown table in the terminal.

**Acceptance Criteria:**
- [ ] Judge prompt instructs the model to output a JSON block in a defined schema: `{ "points": [{ "topic": string, "claude": "agree"|"disagree"|"neutral", "gpt5": ..., "gemini": ..., "grok": ... }] }`
- [ ] JSON is parsed reliably; malformed JSON triggers a retry (max 1 retry) before falling back to a plain-text note
- [ ] Table is rendered in terminal with model names as columns and debate points as rows
- [ ] Table is included in the `--export` Markdown output (Story 10)
- [ ] Minimum 3 points extracted per query

**Priority:** P0 | **Effort:** M | **Dependencies:** Story 6

---

### Story 8: Cost Display per Query

**Why:** Transparency on cost is a core differentiator vs Perplexity — users chose this tool specifically to control and understand their spend. Without cost display the value proposition is incomplete.

**What:** After each query completes, parse the `usage` field from each OpenRouter response. Calculate per-model token cost using the rates in `config.json`. Display a cost summary table at the end of every query output.

**Acceptance Criteria:**
- [ ] `config.json` includes `inputCostPerM` and `outputCostPerM` for each model
- [ ] Cost summary shows: model name, input tokens, output tokens, cost (USD) per model
- [ ] Final row shows total tokens and total cost across all models + judge
- [ ] Cost is displayed to 4 decimal places (e.g. `$0.0342`)
- [ ] Cost summary is included in `--export` Markdown output (Story 10)

**Priority:** P0 | **Effort:** S | **Dependencies:** Story 7

---

## P1 Stories — Should Have

---

### Story 9: --rounds CLI Flag

**Why:** 2 rounds is the right default but some queries need more depth (3 rounds) and some just need a quick take (1 round). Giving users control directly reduces cost anxiety and increases utility.

**What:** Add a `--rounds` CLI flag accepting values `1`, `2`, or `3`. Default is `2`. Validate input and show usage hint on invalid value.

**Acceptance Criteria:**
- [ ] `npx ts-node src/index.ts "my prompt" --rounds 1` runs a single-round debate
- [ ] `--rounds 3` runs 3 full debate rounds before the judge call
- [ ] Invalid value (e.g. `--rounds 5`) prints `Error: --rounds must be 1, 2, or 3` and exits with code 1
- [ ] Default behaviour (no flag) is identical to `--rounds 2`

**Priority:** P1 | **Effort:** S | **Dependencies:** Story 5

---

### Story 10: --export Markdown Flag

**Why:** Researchers and business users need to include debate outputs in reports, documents, and team communications. A one-command export removes manual copy-paste friction.

**What:** Add an `--export` CLI flag. When set, save the full debate output (all rounds + consensus + agreement table + cost summary) as a `.md` file in `./output/` with a timestamp filename.

**Acceptance Criteria:**
- [ ] `--export` saves file to `./output/YYYY-MM-DD_HH-MM-SS.md`
- [ ] `./output/` directory is created automatically if it doesn't exist
- [ ] Exported file contains: prompt, all round responses labelled by role, consensus, agreement table, cost summary
- [ ] Terminal output is unchanged when `--export` is used — it still prints to console
- [ ] File is valid Markdown that renders correctly in VS Code preview

**Priority:** P1 | **Effort:** S | **Dependencies:** Story 8

---

### Story 11: Per-Model Error Handling

**Why:** Individual model outages or rate limits are inevitable at scale. Silently failing or crashing the whole query when one model errors destroys trust and usability.

**What:** Wrap each model call in an individual try/catch. On failure, substitute the model's slot with an error notice in the debate context. Continue with remaining models. Surface a non-blocking warning in terminal output.

**Acceptance Criteria:**
- [ ] A single model API failure does not abort the query — remaining models complete normally
- [ ] Failed model slot shows `[Model Name: unavailable — excluded from this round]` in output
- [ ] Failed model is excluded from the agreement table (column omitted or marked `N/A`)
- [ ] If 3+ models fail in the same round, the query aborts with `Error: insufficient models to debate (< 2 available)`
- [ ] Error details (status code, message) logged to `./logs/errors.log` for debugging

**Priority:** P1 | **Effort:** M | **Dependencies:** Story 4

---

### Story 12: CLI Entry Point & Help Text

**Why:** Without a clean entry point and help text the app is unusable by anyone other than the author. A polished CLI is the product's entire UX in Phase 1.

**What:** Wire up `src/index.ts` as the CLI entry point. Accept the user's prompt as a positional argument. Support `--help` flag with usage instructions. Display a welcome banner on startup.

**Acceptance Criteria:**
- [ ] `npx ts-node src/index.ts "Is TypeScript better than Python?"` runs a full debate end-to-end
- [ ] `--help` prints: usage syntax, available flags (`--rounds`, `--export`), example commands
- [ ] Prompt is required — missing prompt prints `Error: prompt is required` and shows usage hint
- [ ] Welcome banner shows app name, model lineup, and estimated cost range on startup
- [ ] App exits with code `0` on success, `1` on any unrecoverable error

**Priority:** P1 | **Effort:** S | **Dependencies:** Story 8

---

## Story Map

```
Must ship (P0) ──────────────────────────────────────────────────────
  [1] Scaffold     →  [2] Config    →  [3] Roles    →  [4] Parallel
  [4] Parallel     →  [5] Rounds    →  [6] Judge    →  [7] Table
  [7] Table        →  [8] Cost

Should ship (P1) ────────────────────────────────────────────────────
  [9] --rounds     →  [10] --export →  [11] Errors  →  [12] CLI UX
```

---

## Technical Notes

- Use `openai` npm package pointed at `https://openrouter.ai/api/v1` — drop-in compatible, no custom HTTP client needed
- `Promise.allSettled()` over `Promise.all()` for parallel calls — ensures one failure doesn't reject the whole batch
- Judge JSON extraction: instruct the model to wrap JSON in ` ```json ``` ` fences — easier to parse reliably than inline JSON
- Use `chalk` for terminal colour/formatting; `cli-table3` for the agreement table rendering
- `dotenv` for `.env` loading; `minimist` or `yargs` for CLI flag parsing
- Keep `src/index.ts` thin — orchestration logic in `src/council.ts`, OpenRouter client in `src/client.ts`

---

## Open Questions

- Should the judge retry on malformed JSON once, or ask the user to re-run? (Story 7)
- Should `./output/` filenames be customisable via a `--name` flag, or timestamp-only for now?
