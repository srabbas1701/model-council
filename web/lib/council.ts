import OpenAI from 'openai';
import type { AppConfig, ModelConfig, ModelResponse, RoundResult, JudgeResult, AgreementPoint, DebateEvent } from './types';

const apiKey = process.env.OPENROUTER_API_KEY;

function getClient() {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: { 'HTTP-Referer': 'https://github.com/model-council', 'X-Title': 'Model Council' },
  });
}

function calcCost(input: number, output: number, m: { inputCostPerM: number; outputCostPerM: number }) {
  return (input / 1_000_000) * m.inputCostPerM + (output / 1_000_000) * m.outputCostPerM;
}

async function callModel(modelId: string, systemPrompt: string, userPrompt: string, maxTokens: number) {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: modelId, max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  });
  const content = res.choices[0]?.message?.content ?? '';
  return { content, inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
}

function buildPrompt(round: number, userPrompt: string, priorRounds: RoundResult[]): string {
  if (round === 1) return userPrompt;
  const prior = priorRounds.flatMap(r =>
    r.responses.filter(x => !x.error).map(x => `[${x.model.role}]:\n${x.content}`)
  ).join('\n\n---\n\n');
  return `Original question: ${userPrompt}\n\nPrior debate:\n${prior}\n\nNow give your Round ${round} response — engage directly with at least one other council member's argument.`;
}

export async function* runDebateStream(
  prompt: string,
  config: AppConfig,
  rounds: number
): AsyncGenerator<DebateEvent> {
  const allRounds: RoundResult[] = [];
  const start = Date.now();

  for (let r = 1; r <= rounds; r++) {
    yield { type: 'round_start', round: r };

    const roundPrompt = buildPrompt(r, prompt, allRounds);

    const tasks = config.council.map(async (model): Promise<ModelResponse> => {
      const max = model.maxTokens ?? config.defaults.maxTokensPerModel;
      try {
        const { content, inputTokens, outputTokens } = await callModel(model.id, model.systemPrompt ?? '', roundPrompt, max);
        if (!content.trim()) throw new Error('Empty response');
        return { model, content, inputTokens, outputTokens, cost: calcCost(inputTokens, outputTokens, model) };
      } catch (e) {
        return { model, content: '', inputTokens: 0, outputTokens: 0, cost: 0, error: (e as Error).message };
      }
    });

    // fire all in parallel, yield each as it resolves
    const settled = await Promise.allSettled(tasks);
    const responses: ModelResponse[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        responses.push(s.value);
        yield { type: 'model_response', round: r, response: s.value };
      }
    }

    if (responses.filter(x => !x.error).length < 2) {
      yield { type: 'error', message: 'Too many models failed — need at least 2 to debate.' };
      return;
    }
    allRounds.push({ round: r, responses });
  }

  yield { type: 'judge_start' };

  const debateText = allRounds.map(r =>
    `=== Round ${r.round} ===\n` +
    r.responses.filter(x => !x.error).map(x => `[${x.model.role}]:\n${x.content}`).join('\n\n---\n\n')
  ).join('\n\n');

  const judgePrompt = `You are a neutral judge synthesising a multi-model debate.

Original question: ${prompt}

${debateText}

Tasks:
1. Write a 2-3 paragraph consensus answer referencing at least 2 council members by role name.
2. Output a JSON block (wrapped in \`\`\`json ... \`\`\`) with 3-5 key debate points.

JSON schema:
{
  "points": [
    {
      "topic": "brief label",
      "Devil's Advocate": "agree"|"disagree"|"neutral",
      "Optimist": "agree"|"disagree"|"neutral",
      "Analyst": "agree"|"disagree"|"neutral",
      "Creative": "agree"|"disagree"|"neutral"
    }
  ]
}

Write consensus first, then JSON block.`;

  try {
    const { content, inputTokens, outputTokens } = await callModel(
      config.judge.id, 'You are a neutral judge. Be concise and fair.', judgePrompt, 2048
    );

    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    let agreementPoints: AgreementPoint[] = [];
    let consensus = content;

    if (jsonMatch) {
      try {
        agreementPoints = JSON.parse(jsonMatch[1]).points ?? [];
        consensus = content.replace(/```json[\s\S]*?```/, '').trim();
      } catch { /* keep raw content */ }
    }

    const judgeResult: JudgeResult = {
      consensus, agreementPoints, inputTokens, outputTokens,
      cost: calcCost(inputTokens, outputTokens, config.judge),
    };

    yield { type: 'consensus', result: judgeResult };

    const totalCost =
      allRounds.flatMap(r => r.responses).reduce((s, x) => s + x.cost, 0) + judgeResult.cost;

    yield { type: 'complete', totalCost, durationMs: Date.now() - start };
  } catch (e) {
    yield { type: 'error', message: `Judge failed: ${(e as Error).message}` };
  }
}
