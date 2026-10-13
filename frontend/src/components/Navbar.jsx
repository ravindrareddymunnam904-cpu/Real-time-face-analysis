import React from 'react';
import { Eye, Mic, MicOff, LogOut, User as UserIcon, Shield, Radio, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';

export default function Navbar({ currentPage, onNavigate }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isListening, statusText, lastCommand, toggleVoice, supported } = useVoice();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(20,184,166,0.5)] group-hover:shadow-[0_0_20px_rgba(20,184,166,0.8)] transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Eye className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-white">AI VISION</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded">
                Real-Time
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Face Analytics & Computer Vision</p>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && (
            <>
              {/* Voice Control Button & Live Status */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={!supported}
                  title={supported ? (isListening ? 'Stop listening' : 'Start voice commands') : 'Speech recognition unsupported'}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-300 border ${
                    isListening
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
                      : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-teal-500/40 hover:text-teal-300'
                  }`}
                >
                  {isListening ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="hidden md:inline font-semibold">
                    {isListening ? 'Listening...' : 'Voice Mic'}
                  </span>
                </button>

                {/* Last recognized voice command pill */}
                {lastCommand && (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/60 border border-teal-500/30 text-[11px] text-teal-300 font-mono">
                    <Radio className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-slate-400">Cmd:</span>
                    <span className="font-semibold truncate max-w-[140px]">&quot;{lastCommand}&quot;</span>
                  </div>
                )}
              </div>

              {/* Direct Quick Launch Camera */}
              <button
                type="button"
                onClick={() => onNavigate('live')}
                className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentPage === 'live'
                    ? 'bg-teal-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                    : 'bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Live Camera
              </button>

              {/* User info and Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-200">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_20px_rgba(20,184,166,0.6)] transition-all"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
