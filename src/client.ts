import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error('Error: OPENROUTER_API_KEY not set in .env');
  process.exit(1);
}

export const openRouterClient = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/model-council',
    'X-Title': 'Model Council',
  },
});

export async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await openRouterClient.chat.completions.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  return { content, inputTokens, outputTokens };
}
