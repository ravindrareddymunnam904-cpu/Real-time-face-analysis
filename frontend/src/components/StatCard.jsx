import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, badge, color = 'teal' }) {
  const colorMap = {
    teal: {
      border: 'border-teal-500/20 hover:border-teal-500/40',
      iconBg: 'bg-teal-500/10 text-teal-400',
      glow: 'hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]',
      badge: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/10 text-purple-400',
      glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div
      className={`glass-panel p-5 rounded-2xl border transition-all duration-300 ${scheme.border} ${scheme.glow}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {badge && (
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${scheme.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
  );
}
