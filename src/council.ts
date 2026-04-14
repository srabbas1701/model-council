import chalk from 'chalk';
import { callModel } from './client.js';
import { AppConfig, ModelConfig, ModelResponse, RoundResult, JudgeResult, DebateResult, AgreementPoint } from './types.js';

function calcCost(inputTokens: number, outputTokens: number, model: { inputCostPerM: number; outputCostPerM: number }): number {
  return (inputTokens / 1_000_000) * model.inputCostPerM +
         (outputTokens / 1_000_000) * model.outputCostPerM;
}

async function callModelSafe(
  model: ModelConfig,
  userPrompt: string,
  defaultMaxTokens: number
): Promise<ModelResponse> {
  const maxTokens = model.maxTokens ?? defaultMaxTokens;
  try {
    const { content, inputTokens, outputTokens } = await callModel(
      model.id,
      model.systemPrompt ?? '',
      userPrompt,
      maxTokens
    );
    if (!content || content.trim() === '') {
      throw new Error('Empty response received — model returned no content');
    }
    const cost = calcCost(inputTokens, outputTokens, model);
    return { model, content, inputTokens, outputTokens, cost };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  [${model.role}] failed: ${message}`));
    return {
      model,
      content: '',
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      error: message,
    };
  }
}

function buildRound1Prompt(userPrompt: string): string {
  return userPrompt;
}

function buildRound2Prompt(userPrompt: string, round1Results: ModelResponse[]): string {
  const prior = round1Results
    .filter(r => !r.error)
    .map(r => `[${r.model.role} — ${r.model.id}]:\n${r.content}`)
    .join('\n\n---\n\n');

  return `Original question: ${userPrompt}

The other council members have responded in Round 1. Read their positions carefully, then provide your Round 2 response. You may defend, revise, or challenge your initial position — but you must directly engage with at least one other council member's argument.

=== Round 1 Responses ===
${prior}

=== Your Round 2 Response ===`;
}

function buildSubsequentRoundPrompt(userPrompt: string, allPriorRounds: RoundResult[], currentRound: number): string {
  const priorText = allPriorRounds.map(round => {
    const responses = round.responses
      .filter(r => !r.error)
      .map(r => `[${r.model.role}]:\n${r.content}`)
      .join('\n\n---\n\n');
    return `=== Round ${round.round} ===\n${responses}`;
  }).join('\n\n');

  return `Original question: ${userPrompt}

The council has debated across ${allPriorRounds.length} round(s). This is Round ${currentRound}. Build on the evolving debate — move toward synthesis or deepen your strongest disagreement.

${priorText}

=== Your Round ${currentRound} Response ===`;
}

async function runRound(
  roundNumber: number,
  userPrompt: string,
  config: AppConfig,
  priorRounds: RoundResult[]
): Promise<RoundResult> {
  console.log(chalk.bold.cyan(`\n${'═'.repeat(60)}`));
  console.log(chalk.bold.cyan(`  Round ${roundNumber}`));
  console.log(chalk.bold.cyan(`${'═'.repeat(60)}\n`));

  const prompt = roundNumber === 1
    ? buildRound1Prompt(userPrompt)
    : roundNumber === 2
      ? buildRound2Prompt(userPrompt, priorRounds[0].responses)
      : buildSubsequentRoundPrompt(userPrompt, priorRounds, roundNumber);

  const tasks = config.council.map(model => {
    process.stdout.write(chalk.gray(`  [${model.role}] thinking...\n`));
    return callModelSafe(model, prompt, config.defaults.maxTokensPerModel);
  });

  const responses = await Promise.all(tasks);

  for (const res of responses) {
    if (res.error) {
      console.log(chalk.red(`\n[${res.model.role} — ${res.model.id}]: unavailable — excluded from this round`));
    } else {
      console.log(chalk.bold.yellow(`\n[${res.model.role} — ${res.model.id}]`));
      console.log(res.content);
    }
  }

  const available = responses.filter(r => !r.error);
  if (available.length < 2) {
    throw new Error('Insufficient models to debate (< 2 available). Check your API key and model IDs.');
  }

  return { round: roundNumber, responses };
}

async function runJudge(
  userPrompt: string,
  allRounds: RoundResult[],
  config: AppConfig
): Promise<JudgeResult> {
  console.log(chalk.bold.cyan(`\n${'═'.repeat(60)}`));
  console.log(chalk.bold.cyan(`  Judge — Synthesising Consensus`));
  console.log(chalk.bold.cyan(`${'═'.repeat(60)}\n`));

  const debateText = allRounds.map(round => {
    const responses = round.responses
      .filter(r => !r.error)
      .map(r => `[${r.model.role}]:\n${r.content}`)
      .join('\n\n---\n\n');
    return `=== Round ${round.round} ===\n${responses}`;
  }).join('\n\n');

  const judgePrompt = `You are a neutral judge synthesising a multi-model debate.

Original question: ${userPrompt}

${debateText}

Your tasks:
1. Write a 2-3 paragraph consensus answer that integrates the strongest points from all council members. Reference at least 2 council members by their role name.
2. Output a JSON block (wrapped in \`\`\`json ... \`\`\`) identifying 3-5 key debate points and each council member's position.

JSON schema:
{
  "points": [
    {
      "topic": "brief topic label",
      "Devil's Advocate": "agree" | "disagree" | "neutral",
      "Optimist": "agree" | "disagree" | "neutral",
      "Analyst": "agree" | "disagree" | "neutral",
      "Creative": "agree" | "disagree" | "neutral"
    }
  ]
}

Write the consensus first, then the JSON block.`;

  let judgeResponse: { content: string; inputTokens: number; outputTokens: number };

  try {
    judgeResponse = await callModel(
      config.judge.id,
      'You are a neutral judge. Be concise, fair, and precise.',
      judgePrompt,
      2048
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Judge call failed: ${message}`);
  }

  // Extract consensus text and JSON block
  const jsonMatch = judgeResponse.content.match(/```json\s*([\s\S]*?)```/);
  let agreementPoints: AgreementPoint[] = [];
  let consensus = judgeResponse.content;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      agreementPoints = parsed.points ?? [];
      consensus = judgeResponse.content.replace(/```json[\s\S]*?```/, '').trim();
    } catch {
      // Retry once with a stricter prompt
      try {
        const retryResponse = await callModel(
          config.judge.id,
          'You are a neutral judge. Output ONLY valid JSON, no other text.',
          `Extract the agreement points from this debate as JSON matching this schema exactly:
{ "points": [{ "topic": string, "Devil's Advocate": "agree"|"disagree"|"neutral", "Optimist": "agree"|"disagree"|"neutral", "Analyst": "agree"|"disagree"|"neutral", "Creative": "agree"|"disagree"|"neutral" }] }

Debate summary: ${judgeResponse.content.substring(0, 2000)}`,
          512
        );
        const retryParsed = JSON.parse(retryResponse.content);
        agreementPoints = retryParsed.points ?? [];
      } catch {
        console.warn(chalk.yellow('  Warning: Could not extract agreement table — showing consensus only.'));
      }
    }
  }

  const cost = calcCost(judgeResponse.inputTokens, judgeResponse.outputTokens, config.judge);

  console.log(chalk.bold.green('\n=== Final Consensus ===\n'));
  console.log(consensus);

  return {
    consensus,
    agreementPoints,
    inputTokens: judgeResponse.inputTokens,
    outputTokens: judgeResponse.outputTokens,
    cost,
  };
}

export async function runDebate(
  userPrompt: string,
  config: AppConfig,
  rounds: number
): Promise<DebateResult> {
  const startTime = Date.now();
  const allRounds: RoundResult[] = [];

  for (let i = 1; i <= rounds; i++) {
    const result = await runRound(i, userPrompt, config, allRounds);
    allRounds.push(result);
  }

  const judgeResult = await runJudge(userPrompt, allRounds, config);

  const totalCost =
    allRounds.flatMap(r => r.responses).reduce((sum, r) => sum + r.cost, 0) +
    judgeResult.cost;

  return {
    prompt: userPrompt,
    rounds: allRounds,
    judge: judgeResult,
    totalCost,
    durationMs: Date.now() - startTime,
  };
}
