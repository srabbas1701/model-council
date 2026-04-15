'use client';
import type { ModelResponse } from '@/lib/types';

const ROLE_COLORS: Record<string, { accent: string; bg: string; label: string }> = {
  "Devil's Advocate": { accent: '#f87171', bg: 'rgba(248,113,113,0.08)', label: '👹' },
  'Optimist':         { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  label: '✨' },
  'Analyst':          { accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  label: '🔍' },
  'Creative':         { accent: '#c084fc', bg: 'rgba(192,132,252,0.08)', label: '💡' },
};

interface Props {
  response: ModelResponse;
  round: number;
  isThinking?: boolean;
}

function renderMarkdown(text: string) {
  return text
    .replace(/### (.+)/g,  '<h3>$1</h3>')
    .replace(/## (.+)/g,   '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)/gm,  '<li>$1</li>')
    .replace(/((?:<li>[^]*?<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/^---$/gm,    '<hr/>')
    .split('\n\n')
    .map(p => p.startsWith('<') ? p : `<p>${p}</p>`)
    .join('\n');
}

export default function ModelCard({ response, round, isThinking = false }: Props) {
  const colors = ROLE_COLORS[response.model.role] ?? { accent: '#6366f1', bg: 'rgba(99,102,241,0.08)', label: '🤖' };
  const shortId = response.model.id.split('/')[1] ?? response.model.id;

  return (
    <div
      className="glass-strong rounded-2xl p-5 flex flex-col gap-3 transition-all duration-500"
      style={{ borderColor: `${colors.accent}30` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{colors.label}</span>
          <div>
            <p className="font-grotesk font-semibold text-sm tracking-tight" style={{ color: colors.accent }}>
              {response.model.role}
            </p>
            <p className="text-slate-500 text-xs font-grotesk">
              {shortId} · Round {round}
            </p>
          </div>
        </div>
        {!isThinking && !response.error && (
          <div className="flex items-center gap-2 text-xs font-grotesk text-slate-500">
            <span>{response.outputTokens} tok</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: colors.bg, color: colors.accent }}>
              ${response.cost.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[80px]">
        {isThinking ? (
          <div className="flex items-center gap-3 pt-2">
            <div className="spinner" />
            <span className="text-slate-500 text-sm italic">thinking...</span>
          </div>
        ) : response.error ? (
          <p className="text-red-400 text-sm italic">{response.error}</p>
        ) : (
          <div
            className="model-prose text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(response.content) }}
          />
        )}
      </div>
    </div>
  );
}
