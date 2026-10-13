import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function DisclaimerBadge({ className = '' }) {
  return (
    <div className={`p-3 rounded-xl border border-teal-500/20 bg-teal-950/20 text-xs text-slate-300 flex items-start gap-2.5 ${className}`}>
      <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="font-semibold text-teal-300 flex items-center gap-1.5">
          <span>Ethical AI & Privacy Notice</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-teal-500/20 text-teal-300 rounded">Client-Side Only</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          All age ranges, facial expressions, and sex categories shown are <strong>purely AI model estimates</strong> based on 2D visual surface features. They do not constitute biometric identification or determine internal emotional state or personal gender identity. No raw video, frames, or biometric templates are stored.
        </p>
      </div>
    </div>
  );
}
