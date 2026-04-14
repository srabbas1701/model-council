'use client';
import { IconBrain } from '@tabler/icons-react';

export default function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{ mixBlendMode: 'normal' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
            <IconBrain size={18} color="#6366f1" />
          </div>
          <span className="font-grotesk font-700 text-white tracking-tight" style={{ fontSize: 15 }}>
            model council
          </span>
        </div>

        {/* Pill nav */}
        <nav className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
             style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['Models', 'How it works', 'Pricing'].map(item => (
            <button key={item}
              className="px-3 py-1 rounded-full text-slate-400 hover:text-white transition-colors duration-300 text-xs font-medium cursor-pointer"
              style={{ fontFamily: 'Inter' }}>
              {item}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <button
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all duration-500 cursor-pointer"
          style={{
            background: '#6366f1',
            boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            fontFamily: 'Inter',
          }}>
          Get API Access
        </button>
      </div>
    </header>
  );
}
