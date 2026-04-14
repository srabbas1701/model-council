'use client';
import { useState, useRef, useEffect } from 'react';
import type { ModelResponse, JudgeResult, DebateEvent } from '@/lib/types';
import ModelCard from './ModelCard';
import AgreementTable from './AgreementTable';
import CostSummary from './CostSummary';
import { IconArrowLeft, IconBrain } from '@tabler/icons-react';

interface RoundData {
  round: number;
  responses: ModelResponse[];
}

interface Props {
  prompt: string;
  rounds: number;
  onReset: () => void;
}

const COUNCIL_ROLES = ["Devil's Advocate", 'Optimist', 'Analyst', 'Creative'];

export default function DebateView({ prompt, rounds, onReset }: Props) {
  const [activeRound, setActiveRound]     = useState(1);
  const [roundData, setRoundData]         = useState<RoundData[]>([]);
  const [thinking, setThinking]           = useState<string[]>([]);
  const [judgeThinking, setJudgeThinking] = useState(false);
  const [consensus, setConsensus]         = useState<JudgeResult | null>(null);
  const [totalCost, setTotalCost]         = useState(0);
  const [durationMs, setDurationMs]       = useState(0);
  const [status, setStatus]               = useState<'running' | 'done' | 'error'>('running');
  const [errorMsg, setErrorMsg]           = useState('');
  const allResponses = roundData.flatMap(r => r.responses);
  const consensusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, rounds }),
          signal: ctrl.signal,
        });

        const reader = res.body?.getReader();
        if (!reader) return;
        const dec = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const evt: DebateEvent = JSON.parse(line.slice(6));
            handleEvent(evt);
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setStatus('error');
          setErrorMsg((e as Error).message);
        }
      }
    })();

    return () => ctrl.abort();
  }, [prompt, rounds]);

  function handleEvent(evt: DebateEvent) {
    switch (evt.type) {
      case 'round_start':
        setActiveRound(evt.round);
        setThinking([...COUNCIL_ROLES]);
        break;
      case 'model_response':
        setThinking(prev => prev.filter(r => r !== evt.response.model.role));
        setRoundData(prev => {
          const existing = prev.find(r => r.round === evt.round);
          if (existing) {
            return prev.map(r => r.round === evt.round
              ? { ...r, responses: [...r.responses, evt.response] }
              : r
            );
          }
          return [...prev, { round: evt.round, responses: [evt.response] }];
        });
        break;
      case 'judge_start':
        setThinking([]);
        setJudgeThinking(true);
        break;
      case 'consensus':
        setJudgeThinking(false);
        setConsensus(evt.result);
        setTimeout(() => consensusRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        break;
      case 'complete':
        setTotalCost(evt.totalCost);
        setDurationMs(evt.durationMs);
        setStatus('done');
        break;
      case 'error':
        setStatus('error');
        setErrorMsg(evt.message);
        break;
    }
  }

  // build placeholder cards for still-thinking models
  const thinkingCards: ModelResponse[] = thinking.map(role => ({
    model: { id: '', role, inputCostPerM: 0, outputCostPerM: 0 },
    content: '', inputTokens: 0, outputTokens: 0, cost: 0,
  }));

  const currentRoundResponses = roundData.find(r => r.round === activeRound)?.responses ?? [];
  const visibleResponses = [...currentRoundResponses, ...thinkingCards.filter(
    tc => !currentRoundResponses.some(r => r.model.role === tc.model.role)
  )];

  return (
    <div className="min-h-screen grid-overlay" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onReset}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-300 text-sm font-grotesk cursor-pointer">
            <IconArrowLeft size={16} />
            New debate
          </button>
          <div className="flex items-center gap-2 text-xs font-grotesk text-slate-500">
            {status === 'running' && <><div className="spinner" /> <span>Council deliberating…</span></>}
            {status === 'done'    && <span className="text-green-400">✓ Complete · ${totalCost.toFixed(4)}</span>}
            {status === 'error'   && <span className="text-red-400">Error</span>}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-10">
          <p className="text-slate-500 text-xs font-grotesk uppercase tracking-widest mb-2">Prompt</p>
          <h1 className="font-lora text-2xl md:text-3xl text-white leading-tight" style={{ fontStyle: 'italic' }}>
            "{prompt}"
          </h1>
        </div>

        <div className="flex gap-8">
          {/* Sticky round nav */}
          <aside className="hidden lg:block w-44 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-slate-600 text-xs font-grotesk uppercase tracking-widest mb-4">Rounds</p>
              {Array.from({ length: rounds }, (_, i) => i + 1).map(r => {
                const done = roundData.some(rd => rd.round === r);
                const active = r === activeRound;
                return (
                  <button key={r} onClick={() => setActiveRound(r)}
                    className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer"
                    style={{ background: active ? 'rgba(99,102,241,0.12)' : 'transparent' }}>
                    <div className="w-1.5 h-1.5 rounded-full"
                         style={{ background: active ? '#6366f1' : done ? '#34d399' : 'rgba(148,163,184,0.3)' }} />
                    <span className="text-sm font-grotesk"
                          style={{ color: active ? '#fff' : done ? '#94a3b8' : '#475569',
                                   fontWeight: active ? 600 : 400 }}>
                      Round {r}
                    </span>
                  </button>
                );
              })}
              {(judgeThinking || consensus) && (
                <button onClick={() => consensusRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer"
                  style={{ background: consensus ? 'rgba(99,102,241,0.12)' : 'transparent' }}>
                  <div className="w-1.5 h-1.5 rounded-full pulse-dot"
                       style={{ background: consensus ? '#6366f1' : 'rgba(99,102,241,0.4)' }} />
                  <span className="text-sm font-grotesk"
                        style={{ color: consensus ? '#fff' : '#475569', fontWeight: consensus ? 600 : 400 }}>
                    Consensus
                  </span>
                </button>
              )}
              {status === 'done' && (
                <button onClick={() => consensusRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#94a3b8' }} />
                  <span className="text-sm font-grotesk text-slate-500">Cost</span>
                </button>
              )}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 space-y-10 min-w-0">
            {/* Round tabs (mobile) */}
            <div className="flex gap-2 lg:hidden overflow-x-auto pb-1">
              {Array.from({ length: rounds }, (_, i) => i + 1).map(r => (
                <button key={r} onClick={() => setActiveRound(r)}
                  className="px-4 py-1.5 rounded-full text-xs font-grotesk font-medium shrink-0 cursor-pointer transition-all duration-300"
                  style={{
                    background: r === activeRound ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: r === activeRound ? '#fff' : '#64748b',
                  }}>
                  Round {r}
                </button>
              ))}
            </div>

            {/* Round heading */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }}>
                  {activeRound}
                </div>
                <h2 className="font-grotesk font-semibold text-white text-sm tracking-tight">
                  Round {activeRound}
                  {activeRound > 1 && <span className="text-slate-500 font-normal ml-2 text-xs">— Models respond to each other</span>}
                </h2>
              </div>

              {/* 2-col model cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleResponses.map((resp, i) => (
                  <ModelCard
                    key={`${activeRound}-${resp.model.role}-${i}`}
                    response={resp}
                    round={activeRound}
                    isThinking={thinking.includes(resp.model.role)}
                  />
                ))}
              </div>
            </div>

            {/* Consensus section */}
            {(judgeThinking || consensus) && (
              <div ref={consensusRef} className="space-y-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                       style={{ background: 'rgba(99,102,241,0.2)' }}>
                    <IconBrain size={14} color="#6366f1" />
                  </div>
                  <h2 className="font-grotesk font-semibold text-white text-sm tracking-tight">Final Consensus</h2>
                  {judgeThinking && <div className="spinner" />}
                </div>

                {consensus ? (
                  <>
                    {/* Consensus text */}
                    <div className="glass-strong rounded-2xl p-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                      <p className="text-slate-500 text-xs font-grotesk uppercase tracking-widest mb-4">Council Verdict</p>
                      <div className="space-y-3">
                        {consensus.consensus.split('\n\n').map((para, i) => (
                          <p key={i} className="text-slate-200 leading-relaxed text-sm">{para}</p>
                        ))}
                      </div>
                    </div>

                    {/* Agreement table */}
                    <AgreementTable points={consensus.agreementPoints} />
                  </>
                ) : (
                  <div className="glass-strong rounded-2xl p-6 flex items-center gap-4">
                    <div className="spinner" />
                    <div>
                      <p className="text-white text-sm font-medium">Judge is synthesising…</p>
                      <p className="text-slate-500 text-xs mt-0.5">Extracting consensus and agreement matrix</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cost summary */}
            {status === 'done' && consensus && (
              <CostSummary
                responses={allResponses}
                judge={consensus}
                totalCost={totalCost}
                durationMs={durationMs}
              />
            )}

            {status === 'error' && (
              <div className="rounded-2xl p-5 text-red-400 text-sm"
                   style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {errorMsg}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
