import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { runDebateStream } from '@/lib/council';
import type { AppConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

function loadConfig(): AppConfig {
  const configPath = path.resolve(process.cwd(), '..', 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
}

export async function POST(req: NextRequest) {
  const { prompt, rounds = 2 } = await req.json() as { prompt: string; rounds?: number };

  if (!prompt?.trim()) {
    return Response.json({ error: 'prompt is required' }, { status: 400 });
  }
  if (![1, 2, 3].includes(rounds)) {
    return Response.json({ error: 'rounds must be 1, 2, or 3' }, { status: 400 });
  }

  const config = loadConfig();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runDebateStream(prompt, config, rounds)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
