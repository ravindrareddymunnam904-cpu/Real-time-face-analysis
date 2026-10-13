import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Volume2,
  Mic,
  Camera,
  Cpu,
  Save,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import DisclaimerBadge from '../components/DisclaimerBadge';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const { supported: speechSupported, speak } = useVoice();

  const currentSettings = user?.settings || {};
  const [detectionInterval, setDetectionInterval] = useState(
    currentSettings.detection_interval_ms || 140
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    Math.round((currentSettings.confidence_threshold || 0.45) * 100)
  );
  const [ttsEnabled, setTtsEnabled] = useState(currentSettings.tts_enabled !== false);
  const [voiceEnabled, setVoiceEnabled] = useState(currentSettings.voice_enabled !== false);
  const [cameraFps, setCameraFps] = useState(currentSettings.camera_fps || 30);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateSettings({
        detection_interval_ms: Number(detectionInterval),
        confidence_threshold: Number(confidenceThreshold) / 100,
        tts_enabled: ttsEnabled,
        voice_enabled: voiceEnabled,
        camera_fps: Number(cameraFps),
        theme: 'dark',
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const testVoiceFeedback = () => {
    speak('Voice feedback audio test confirmed. AI Vision is operational.');
  };

  // Browser capability checks
  const hasCameraApi = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasCanvasApi = typeof document !== 'undefined' && !!document.createElement('canvas').getContext;
  const hasSpeechSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            System & Engine Settings
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono">
            Config
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize computer vision inference frequency, voice assistants, and hardware optimizations.
        </p>
      </div>

      <DisclaimerBadge />

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>Settings saved successfully to your profile.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Computer Vision & Performance Controls */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <Cpu className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-white text-base">Inference & Throttle Parameters</h3>
              <p className="text-xs text-slate-400">Control browser GPU/CPU utilization and inference latency.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Detection Interval */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Detection Interval (Throttling)</label>
                <span className="font-mono text-teal-400 font-bold">{detectionInterval} ms</span>
              </div>
              <input
                type="range"
                min="60"
                max="400"
                step="20"
                value={detectionInterval}
                onChange={(e) => setDetectionInterval(e.target.value)}
                className="w-full accent-teal-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Lower = faster updates; Higher = cooler CPU/battery conservation.
              </p>
            </div>

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">Minimum Confidence Score</label>
                <span className="font-mono text-cyan-400 font-bold">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="85"
                step="5"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Faces with detection scores below this value are filtered out.
              </p>
            </div>
          </div>
        </div>

        {/* Voice Control & Audio Feedback */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <Mic className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-white text-base">Voice Recognition & Audio Feedback</h3>
              <p className="text-xs text-slate-400">Hands-free speech commands powered by Web Speech API.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-2xl border border-white/5">
              <div>
                <span className="text-sm font-semibold text-white block">Text-to-Speech (TTS) Spoken Feedback</span>
                <span className="text-xs text-slate-400">Speak confirmations when actions occur (e.g. &quot;Camera started&quot;).</span>
              </div>
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={testVoiceFeedback}
                className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-950/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Test Audio Feedback</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hardware & Browser Diagnostics */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <Sliders className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-white text-base">Client Environment Diagnostics</h3>
              <p className="text-xs text-slate-400">Verification of browser APIs necessary for local vision tasks.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Camera API:</span>
              <span className={hasCameraApi ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {hasCameraApi ? 'Supported' : 'Missing'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Speech API:</span>
              <span className={speechSupported ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {speechSupported ? 'Supported' : 'Unsupported'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Canvas 2D:</span>
              <span className={hasCanvasApi ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {hasCanvasApi ? 'Hardware Accel' : 'Fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.35)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
