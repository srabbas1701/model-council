import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { runDebate } from './council.js';
import { printAgreementTable, printCostSummary, renderMarkdown } from './display.js';
import { AppConfig } from './types.js';

dotenv.config();

// Load config
const configPath = path.resolve(process.cwd(), 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: config.json not found in project root.');
  process.exit(1);
}
const config: AppConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// CLI setup
const argv = yargs(hideBin(process.argv))
  .usage('Usage: npx ts-node src/index.ts "<prompt>" [options]')
  .command('$0 <prompt>', 'Run a multi-model debate on your prompt', (y) => {
    y.positional('prompt', { type: 'string', describe: 'The question or topic to debate' });
  })
  .option('rounds', {
    alias: 'r',
    type: 'number',
    default: config.defaults.rounds,
    describe: 'Number of debate rounds (1, 2, or 3)',
  })
  .option('output', {
    alias: 'o',
    type: 'boolean',
    default: false,
    describe: 'Save full debate to a Markdown file in ./output/',
  })
  .help()
  .parseSync();

const prompt = argv.prompt as string;
const rounds = argv.rounds as number;
const exportMd = argv.output as boolean;

if (!prompt || prompt.trim() === '') {
  console.error('Error: prompt is required.\nUsage: npx ts-node src/index.ts "<your question>"');
  process.exit(1);
}

if (![1, 2, 3].includes(rounds)) {
  console.error('Error: --rounds must be 1, 2, or 3.');
  process.exit(1);
}

// Banner
console.log(chalk.bold.magenta('\n╔══════════════════════════════════════════════════════════╗'));
console.log(chalk.bold.magenta('║               MODEL COUNCIL                              ║'));
console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════╝\n'));
console.log(chalk.bold('Council:'));
for (const model of config.council) {
  console.log(chalk.gray(`  • ${model.role.padEnd(20)} ${model.id}`));
}
console.log(chalk.bold('\nSettings:'));
console.log(chalk.gray(`  • Rounds:    ${rounds}`));
console.log(chalk.gray(`  • Output:    ${exportMd ? 'yes → ./output/' : 'no'}`));
console.log(chalk.gray(`  • Est. cost: ~$${(rounds * 0.038 + 0.001).toFixed(3)} — ${(rounds * 0.045 + 0.001).toFixed(3)}`));
console.log(chalk.bold('\nPrompt:'));
console.log(chalk.white(`  "${prompt}"\n`));

// Run
(async () => {
  try {
    const result = await runDebate(prompt, config, rounds);

    const roles = config.council.map(m => m.role);
    printAgreementTable(result.judge.agreementPoints, roles);
    printCostSummary(result);

    if (exportMd) {
      const outputDir = path.resolve(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filePath = path.join(outputDir, `${timestamp}.md`);
      fs.writeFileSync(filePath, renderMarkdown(result, roles), 'utf-8');
      console.log(chalk.green(`  Exported to ${filePath}\n`));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`\nFatal error: ${message}`));
    process.exit(1);
  }
})();
