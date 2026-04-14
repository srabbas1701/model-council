'use client';
import type { ModelResponse, JudgeResult } from '@/lib/types';

interface Props {
  responses: ModelResponse[];
  judge: JudgeResult;
  totalCost: number;
  durationMs: number;
}

export default function CostSummary({ responses, judge, totalCost, durationMs }: Props) {
  return (
    <div className="glass-soft rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-grotesk font-semibold text-slate-300 text-sm tracking-tight">Cost Breakdown</h3>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs font-grotesk">{(durationMs / 1000).toFixed(1)}s</span>
            <span className="font-grotesk font-bold text-white text-sm">
              ${totalCost.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
      <div className="px-6 py-3 space-y-2">
        {responses.filter(r => !r.error).map((r, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-grotesk w-32 truncate">{r.model.role}</span>
              <span className="text-slate-600 font-grotesk">{r.model.id.split('/')[1]}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 font-grotesk">
              <span>{r.inputTokens}↑ {r.outputTokens}↓</span>
              <span className="text-slate-300">${r.cost.toFixed(4)}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs pt-1"
             style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-slate-400 font-grotesk">Judge</span>
          <div className="flex items-center gap-3 text-slate-500 font-grotesk">
            <span>{judge.inputTokens}↑ {judge.outputTokens}↓</span>
            <span className="text-slate-300">${judge.cost.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
