import React from 'react';
import {
  LayoutDashboard,
  Camera,
  BarChart3,
  History,
  Settings,
  Shield,
  HelpCircle,
  Cpu,
} from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Camera', icon: Camera, badge: 'Real-time' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History & Faces', icon: History, badge: 'Faces' },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy', label: 'Privacy & Ethics', icon: Shield },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col bg-slate-950/70 border-r border-white/10 min-h-[calc(100vh-65px)] p-4">
      <div className="space-y-1.5 flex-1">
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Platform Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hardware / Inference Status Info Box */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" /> Model Pipeline
            </span>
            <span className="text-teal-400 font-bold">Local</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Client-side neural processing. No cloud video streams or biometrics saved.
          </p>
        </div>

        <div className="px-2 text-center text-[10px] text-slate-400 font-mono">
          AI Vision v1.0.0 • Production Build
        </div>
      </div>
    </aside>
  );
}
