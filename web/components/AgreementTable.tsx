'use client';
import type { AgreementPoint } from '@/lib/types';

const ROLES = ["Devil's Advocate", 'Optimist', 'Analyst', 'Creative'];

const BADGE: Record<string, { label: string; color: string; bg: string }> = {
  agree:    { label: '✓ agree',    color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  disagree: { label: '✗ disagree', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  neutral:  { label: '∼ neutral',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
};

interface Props { points: AgreementPoint[] }

export default function AgreementTable({ points }: Props) {
  if (!points.length) return null;

  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      {/* Title */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="font-grotesk font-semibold text-white text-sm tracking-tight">
          Agreement · Disagreement Matrix
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">Where the council aligned and diverged</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <th className="text-left px-6 py-3 text-slate-400 font-grotesk font-medium text-xs uppercase tracking-wider w-2/5">
                Key Point
              </th>
              {ROLES.map(role => (
                <th key={role} className="px-4 py-3 text-xs font-grotesk font-medium text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((pt, i) => (
              <tr key={i} style={{ borderBottom: i < points.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td className="px-6 py-3 text-slate-300 text-xs leading-relaxed">
                  {pt.topic}
                </td>
                {ROLES.map(role => {
                  const val = (pt[role] ?? 'neutral').toLowerCase();
                  const badge = BADGE[val] ?? BADGE.neutral;
                  return (
                    <td key={role} className="px-4 py-3 text-center">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-grotesk font-medium whitespace-nowrap"
                        style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
