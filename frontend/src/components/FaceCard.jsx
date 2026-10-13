import React, { useState } from 'react';
import { User, Sparkles, Smile, Percent, AlertCircle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { EXPRESSION_COLORS, EXPRESSION_EMOJIS, ALL_EXPRESSIONS } from '../utils/faceDetection';

export default function FaceCard({ person }) {
  const [showAllExpressions, setShowAllExpressions] = useState(true);

  const {
    personId,
    isDemo,
    isAlternateOrNew,
    rawAge,
    ageRange,
    sexCategory,
    sexConfidence,
    expression,
    expressionEmoji,
    expressionConfidence,
    expressionsAll,
    otherExpressions,
    confidence,
    imageThumbnail,
  } = person;

  const expressionColor = EXPRESSION_COLORS[expression.toLowerCase()] || '#14b8a6';

  return (
    <div
      className={`glass-panel p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        isAlternateOrNew
          ? 'border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/40'
          : isDemo
          ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
          : 'border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {imageThumbnail ? (
            <div className="relative">
              <img
                src={imageThumbnail}
                alt={`Person ${personId}`}
                className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-slate-900/90 text-teal-300 border border-teal-500/40 text-[9px] font-mono font-bold">
                #{personId}
              </span>
            </div>
          ) : (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                isAlternateOrNew
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : isDemo
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              }`}
            >
              #{personId}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-white text-base">
                Person {personId}
              </h4>
              {isAlternateOrNew && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  ALTERNATE FACE
                </span>
              )}
              {isDemo && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Demo Data
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Detection Confidence: {confidence}%</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-3xl select-none" title={`Expression: ${expression}`}>
            {expressionEmoji}
          </span>
        </div>
      </div>

      {/* Grid of Estimates */}
      <div className="space-y-3.5">
        {/* 1. Age Range & Estimated Age */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span>🎂</span> Estimated age:
            </span>
            <span className="text-[11px] text-teal-400 font-mono font-semibold">
              {rawAge ? `${rawAge} years old` : 'Point estimate'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-white tracking-wide font-mono">
              Cohort: {ageRange} <span className="text-xs font-sans text-slate-400">years</span>
            </span>
            <span className="text-[11px] text-slate-400">biometric regression</span>
          </div>
        </div>

        {/* 2. Sex Category */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span>👤</span> AI-estimated sex:
            </span>
            <span className="text-xs text-slate-300 font-mono">{sexConfidence}% confidence</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white flex items-center gap-1.5">
              <span>{sexCategory === 'Female' ? '👩' : '👨'}</span>
              <span>{sexCategory}</span>
            </span>
            <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${sexConfidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Primary Expression */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-teal-400" /> Primary facial expression:
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: expressionColor }}>
              {expressionConfidence}%
            </span>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-base font-bold text-white flex items-center gap-1.5">
              <span>{expressionEmoji}</span>
              <span style={{ color: expressionColor }}>{expression}</span>
            </span>
            <span className="text-[10px] text-slate-400">dominant muscle activation</span>
          </div>

          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${expressionConfidence}%`, backgroundColor: expressionColor }}
            />
          </div>
        </div>

        {/* 4. Complete "Other Expressions" Breakdown */}
        <div className="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-teal-400" />
              <span>Other Expressions Spectrum:</span>
            </span>
            <button
              onClick={() => setShowAllExpressions(!showAllExpressions)}
              className="text-[10px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showAllExpressions ? 'Compact' : 'All (6)'}</span>
              {showAllExpressions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* List of other expressions with progress bars */}
          <div className="space-y-1.5 pt-1">
            {(otherExpressions && otherExpressions.length > 0
              ? otherExpressions
              : Object.entries(expressionsAll || {})
                  .filter(([k]) => k.toLowerCase() !== expression.toLowerCase())
                  .map(([k, val]) => ({
                    name: k.charAt(0).toUpperCase() + k.slice(1),
                    key: k.toLowerCase(),
                    percent: val,
                    emoji: EXPRESSION_EMOJIS[k.toLowerCase()] || '😐',
                    color: EXPRESSION_COLORS[k.toLowerCase()] || '#94a3b8',
                  }))
            )
              .slice(0, showAllExpressions ? 6 : 3)
              .map((item) => (
                <div key={item.key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 flex items-center gap-1 font-medium">
                      <span>{item.emoji}</span>
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">{item.percent}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, item.percent)}%`,
                        backgroundColor: item.color,
                        opacity: item.percent > 0 ? 0.9 : 0.2,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
