'use client';
import { useState, useRef } from 'react';
import { IconArrowUp, IconSparkles, IconBrain, IconChartBar, IconMessageCircle } from '@tabler/icons-react';
import Nav from '@/components/Nav';
import DebateView from '@/components/DebateView';

const EXAMPLE_PROMPTS = [
  'Should I build a startup or join a big tech company?',
  'Is remote work better than office work in 2025?',
  'What programming language should I learn first?',
  'Are electric vehicles actually better for the environment?',
];

const MODELS = [
  { role: "Devil's Advocate", model: 'Claude Sonnet 4.6', emoji: '👹', color: '#f87171' },
  { role: 'Optimist',         model: 'GPT-5',             emoji: '✨', color: '#34d399' },
  { role: 'Analyst',          model: 'Gemini 2.5 Pro',    emoji: '🔍', color: '#60a5fa' },
  { role: 'Creative',         model: 'Grok 4 Fast',       emoji: '💡', color: '#c084fc' },
];

export default function HomePage() {
  const [prompt, setPrompt]   = useState('');
  const [rounds, setRounds]   = useState(2);
  const [started, setStarted] = useState(false);
  const [activePrompt, setActivePrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    if (!prompt.trim()) return;
    setActivePrompt(prompt.trim());
    setStarted(true);
  }

  function handleReset() {
    setStarted(false);
    setActivePrompt('');
    setPrompt('');
  }

  if (started) {
    return <DebateView prompt={activePrompt} rounds={rounds} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen grid-overlay relative overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
      <Nav />

      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-16 pb-16 text-center">

        {/* Badge */}
        <div className="reveal reveal-d1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-grotesk font-medium"
             style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
          <IconSparkles size={12} />
          4 AI models · 1 consensus · transparent cost
        </div>

        {/* Headline */}
        <h1 className="reveal reveal-d2 font-lora text-white mb-6 leading-none"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 700, letterSpacing: '-0.03em' }}>
          Ask once.
          <br />
          <span style={{ color: '#6366f1', fontStyle: 'italic' }}>Let the council</span>
          <br />
          decide.
        </h1>

        {/* Sub-headline */}
        <p className="reveal reveal-d3 cursor text-slate-400 mb-12 max-w-xl leading-relaxed"
           style={{ fontSize: '1.05rem', fontFamily: 'Inter' }}>
          Four AI models debate your question, challenge each other, and converge on a consensus
        </p>

        {/* Vibe Input Box */}
        <div className="reveal reveal-d4 w-full max-w-2xl mb-6">
          <div className="relative rounded-2xl glow-input" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {/* Multi-color glow layer */}
            <div className="absolute -inset-px rounded-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500"
                 style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1), rgba(236,72,153,0.08))', filter: 'blur(8px)' }} />

            <div className="relative p-4">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ask anything — research, decisions, creative work…"
                rows={3}
                className="w-full resize-none bg-transparent text-white placeholder-slate-600 text-base leading-relaxed focus:outline-none"
                style={{ fontFamily: 'Inter' }}
              />

              {/* Bottom bar */}
              <div className="flex items-center justify-between mt-3 pt-3"
                   style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-grotesk">Rounds</span>
                  {[1, 2, 3].map(r => (
                    <button key={r} onClick={() => setRounds(r)}
                      className="w-7 h-7 rounded-full text-xs font-grotesk font-medium transition-all duration-300 cursor-pointer"
                      style={{
                        background: rounds === r ? '#6366f1' : 'rgba(255,255,255,0.05)',
                        color: rounds === r ? '#fff' : '#64748b',
                        border: rounds === r ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
                      {r}
                    </button>
                  ))}
                  <span className="text-xs text-slate-600 font-grotesk ml-1">
                    ~${(rounds * 0.038 + 0.001).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium font-grotesk transition-all duration-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: prompt.trim() ? '#6366f1' : 'rgba(99,102,241,0.3)',
                    color: '#fff',
                    boxShadow: prompt.trim() ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                  }}>
                  <IconArrowUp size={16} />
                  Debate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="reveal reveal-d5 flex flex-wrap gap-2 justify-center max-w-2xl">
          {EXAMPLE_PROMPTS.map(ex => (
            <button key={ex} onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
              className="px-3 py-1.5 rounded-full text-xs font-grotesk text-slate-500 transition-all duration-300 cursor-pointer hover:text-slate-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {ex}
            </button>
          ))}
        </div>

        {/* Model showcase */}
        <div className="reveal reveal-d5 mt-16 w-full max-w-2xl">
          <p className="text-slate-600 text-xs font-grotesk uppercase tracking-widest mb-5">The Council</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MODELS.map(m => (
              <div key={m.role} className="glass-soft rounded-xl p-4 text-center transition-all duration-500 hover:glass-strong">
                <div className="text-2xl mb-2">{m.emoji}</div>
                <p className="font-grotesk font-semibold text-xs mb-1" style={{ color: m.color }}>{m.role}</p>
                <p className="text-slate-600 text-xs font-grotesk">{m.model}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative border-t py-16 px-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <IconMessageCircle size={20} color="#6366f1" />, title: 'Multi-turn Debate', desc: 'Models read each other\'s responses and push back across 1–3 rounds.' },
            { icon: <IconChartBar size={20} color="#34d399" />,     title: 'Agreement Matrix', desc: 'See exactly where models align and diverge on each key point.' },
            { icon: <IconBrain size={20} color="#c084fc" />,        title: 'Transparent Cost', desc: 'Every query shows per-model token usage and exact USD cost.' },
          ].map(f => (
            <div key={f.title} className="glass-soft rounded-2xl p-6">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-grotesk font-semibold text-white text-sm mb-2">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
