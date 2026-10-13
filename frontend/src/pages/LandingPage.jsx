import React from 'react';
import {
  Camera,
  ShieldCheck,
  Cpu,
  BarChart2,
  Mic,
  Smile,
  Users,
  Lock,
  ArrowRight,
  CheckCircle2,
  Play,
} from 'lucide-react';
import DisclaimerBadge from '../components/DisclaimerBadge';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden w-full">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            Browser-Native Computer Vision • Zero Video Storage
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none">
            AI Vision – <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400">
              Real-Time Face Analytics
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Privacy-first client-side neural inference analyzing webcam feeds in real time.
            Generates instant estimates for approximate age ranges, facial expressions, and sex categories with full confidence telemetry.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(20,184,166,0.4)] hover:shadow-[0_0_35px_rgba(20,184,166,0.7)] transition-all hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold bg-slate-900 border border-white/10 hover:border-teal-500/40 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 text-teal-400" />
              <span>Sign In / Demo</span>
            </button>
          </div>

          {/* Ethical AI Banner */}
          <div className="pt-6 max-w-2xl mx-auto">
            <DisclaimerBadge />
          </div>
        </div>

        {/* Interactive / Simulated Preview Card */}
        <div className="mt-14 max-w-4xl mx-auto relative">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">live-hud-preview.stream</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-teal-400">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span>60 FPS • 320x240 TENSOR INFERENCE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Simulated Camera Window */}
              <div className="relative aspect-video bg-slate-900 rounded-2xl border border-teal-500/30 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                <div className="scanner-laser" />

                {/* Simulated Bounding Reticle */}
                <div className="relative z-20 w-44 h-48 border border-teal-400/50 rounded-lg p-2 flex flex-col justify-between shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                  <div className="flex justify-between items-center text-[10px] font-mono bg-slate-950/90 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                    <span>PERSON 1</span>
                    <span>94% CONF</span>
                  </div>
                  <div className="text-[10px] bg-slate-950/90 text-slate-200 px-2 py-1 rounded border border-white/10 space-y-0.5">
                    <p>Age: 18–24 (Est)</p>
                    <p>Sex: Male (Visual)</p>
                    <p className="text-teal-300 font-semibold">Happy 😊 (89%)</p>
                  </div>
                </div>

                <div className="absolute bottom-3 left-4 z-20 text-[11px] font-mono text-slate-400">
                  Target: Detected • Multi-Face Ready
                </div>
              </div>

              {/* Live telemetry breakdown */}
              <div className="space-y-3.5 flex flex-col justify-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-teal-400" />
                  Instant Edge Inference Capabilities
                </h3>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Approximate Age Range:</span>
                    <span className="font-mono font-bold text-white">18–24 (Young Adult)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">AI-Estimated Sex Category:</span>
                    <span className="font-mono font-bold text-teal-300">Male (91% model conf)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Detected Facial Expression:</span>
                    <span className="font-mono font-bold text-emerald-400">Happy 😊 (89% score)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Voice Control Support:</span>
                    <span className="font-mono font-bold text-purple-400">Web Speech API Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Engineered for Precision & Ethical Compliance
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            State-of-the-art browser computer vision with non-invasive statistical telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-teal-500/10 text-teal-400 mb-4">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Multi-Face Detection</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Dynamically tracks single and multiple faces with high-frequency bounding box reticles and smooth frame throttling.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
              <Smile className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Expression Estimation</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Evaluates visual patterns for Happy, Neutral, Surprised, Sad, Angry, Fearful, and Disgusted categories with percentage scoring.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Hands-Free Voice Control</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Navigate and trigger operations with natural voice commands like &quot;Start camera&quot;, &quot;Show analytics&quot;, and &quot;Enable demo mode&quot;.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-400 mb-4">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Rich Analytics & Charts</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Visualize demographic distributions and session trends using responsive charts without recording identifying features.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-400 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Presentation Demo Mode</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Demonstrate functionality seamlessly even when cameras are unavailable or restricted, with clearly labeled simulated data.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-teal-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Zero Biometric Storage</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Strict privacy architecture. No images, video clips, embeddings, or biometric templates ever leave the client machine.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Vision – Real-Time Face Analytics. Privacy-by-Design Architecture.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <button onClick={() => onNavigate('privacy')} className="hover:text-teal-300 transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => onNavigate('login')} className="hover:text-teal-300 transition-colors">
              Sign In
            </button>
            <button onClick={() => onNavigate('register')} className="hover:text-teal-300 transition-colors">
              Register
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
