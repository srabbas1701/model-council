import chalk from 'chalk';
import Table from 'cli-table3';
import { DebateResult, AgreementPoint } from './types.js';

const POSITION_SYMBOLS: Record<string, string> = {
  agree: chalk.green('✓ agree'),
  disagree: chalk.red('✗ disagree'),
  neutral: chalk.yellow('~ neutral'),
};

export function printAgreementTable(points: AgreementPoint[], roles: string[]): void {
  if (points.length === 0) return;

  console.log(chalk.bold.cyan('\n=== Agreement / Disagreement Table ===\n'));

  const table = new Table({
    head: [chalk.bold('Key Point'), ...roles.map(r => chalk.bold(r))],
    colWidths: [30, ...roles.map(() => 16)],
    wordWrap: true,
  });

  for (const point of points) {
    table.push([
      point.topic,
      ...roles.map(role => POSITION_SYMBOLS[point[role]] ?? chalk.gray('—')),
    ]);
  }

  console.log(table.toString());
}

export function printCostSummary(result: DebateResult): void {
  console.log(chalk.bold.cyan('\n=== Cost Summary ===\n'));

  const table = new Table({
    head: [chalk.bold('Model'), chalk.bold('Role'), chalk.bold('In tokens'), chalk.bold('Out tokens'), chalk.bold('Cost (USD)')],
    colWidths: [32, 20, 14, 14, 14],
  });

  for (const round of result.rounds) {
    for (const r of round.responses) {
      if (!r.error) {
        table.push([
          r.model.id,
          `${r.model.role} (R${round.round})`,
          r.inputTokens.toString(),
          r.outputTokens.toString(),
          `$${r.cost.toFixed(4)}`,
        ]);
      }
    }
  }

  table.push([
    'Judge (grok-4-fast)',
    'Judge',
    result.judge.inputTokens.toString(),
    result.judge.outputTokens.toString(),
    `$${result.judge.cost.toFixed(4)}`,
  ]);

  table.push([
    chalk.bold('TOTAL'),
    '',
    '',
    '',
    chalk.bold(`$${result.totalCost.toFixed(4)}`),
  ]);

  console.log(table.toString());
  console.log(chalk.gray(`  Completed in ${(result.durationMs / 1000).toFixed(1)}s\n`));
}

export function renderMarkdown(result: DebateResult, roles: string[]): string {
  const lines: string[] = [];

  lines.push(`# Model Council Debate\n`);
  lines.push(`**Prompt:** ${result.prompt}\n`);
  lines.push(`**Date:** ${new Date().toISOString()}\n`);
  lines.push(`**Total Cost:** $${result.totalCost.toFixed(4)}\n`);
  lines.push(`**Duration:** ${(result.durationMs / 1000).toFixed(1)}s\n`);
  lines.push('---\n');

  for (const round of result.rounds) {
    lines.push(`## Round ${round.round}\n`);
    for (const r of round.responses) {
      if (r.error) {
        lines.push(`### [${r.model.role} — ${r.model.id}] — UNAVAILABLE\n`);
      } else {
        lines.push(`### [${r.model.role} — ${r.model.id}]\n`);
        lines.push(`${r.content}\n`);
      }
    }
  }

  lines.push('---\n');
  lines.push('## Final Consensus\n');
  lines.push(`${result.judge.consensus}\n`);

  if (result.judge.agreementPoints.length > 0) {
    lines.push('---\n');
    lines.push('## Agreement / Disagreement Table\n');
    const header = `| Key Point | ${roles.join(' | ')} |`;
    const separator = `|${'-'.repeat(30)}|${roles.map(() => '-'.repeat(14)).join('|')}|`;
    lines.push(header);
    lines.push(separator);
    for (const point of result.judge.agreementPoints) {
      const cells = roles.map(role => point[role] ?? '—');
      lines.push(`| ${point.topic} | ${cells.join(' | ')} |`);
    }
    lines.push('');
  }

  lines.push('---\n');
  lines.push('## Cost Summary\n');
  lines.push('| Model | Role | In Tokens | Out Tokens | Cost (USD) |');
  lines.push('|-------|------|-----------|------------|------------|');
  for (const round of result.rounds) {
    for (const r of round.responses) {
      if (!r.error) {
        lines.push(`| ${r.model.id} | ${r.model.role} (R${round.round}) | ${r.inputTokens} | ${r.outputTokens} | $${r.cost.toFixed(4)} |`);
      }
    }
  }
  lines.push(`| Judge (grok-4-fast) | Judge | ${result.judge.inputTokens} | ${result.judge.outputTokens} | $${result.judge.cost.toFixed(4)} |`);
  lines.push(`| **TOTAL** | | | | **$${result.totalCost.toFixed(4)}** |`);

  return lines.join('\n');
}
