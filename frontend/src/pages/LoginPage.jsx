import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, AlertCircle, Sparkles, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';

export default function LoginPage({ onNavigate }) {
  const { login, register } = useAuth();
  const { isListening, subscribeToCommands, speak } = useVoice();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'demo@aivision.com';
    const demoPass = 'VisionDemo2026!';

    try {
      // Attempt login first
      await login(demoEmail, demoPass);
      onNavigate('dashboard');
    } catch (err) {
      // If user doesn't exist yet, auto-register demo user!
      try {
        await register('Demo Researcher', demoEmail, demoPass);
        onNavigate('dashboard');
      } catch (regErr) {
        setError(regErr.message || 'Could not initialize demo login.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Voice Login listener: Say "sign in" or "voice login" to authenticate instantly
  useEffect(() => {
    const unsub = subscribeToCommands((action) => {
      if (action === 'VOICE_LOGIN') {
        speak('Voice login recognized. Logging in as Demo Researcher.');
        handleQuickDemo();
      }
    });
    return () => unsub();
  }, [subscribeToCommands]);

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-3 text-teal-400">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your face analytics telemetry dashboard
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] disabled:opacity-60 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* 1-Click Demo Login Helper */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-teal-500/30 bg-teal-950/30 hover:bg-teal-900/40 text-teal-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>1-Click Test Demo Account</span>
          </button>

          {/* Voice Login Prompt */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-white/5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-teal-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Voice Login: Say <strong>&quot;Sign in&quot;</strong> or <strong>&quot;Voice login&quot;</strong></span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {isListening ? 'Listening' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
          Don&apos;t have an account yet?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-teal-400 font-semibold hover:underline ml-1"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
