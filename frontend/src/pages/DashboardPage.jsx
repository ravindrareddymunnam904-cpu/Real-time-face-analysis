import React, { useState, useEffect } from 'react';
import {
  Users,
  Camera,
  Smile,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import DisclaimerBadge from '../components/DisclaimerBadge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EXPRESSION_COLORS } from '../utils/faceDetection';

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const data = await api.analytics.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.warn('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Helper to add sample presentation session if empty
  const handleSeedSampleSession = async () => {
    try {
      await api.sessions.saveSession({
        session_name: 'Introductory Demo Session',
        duration_seconds: 145,
        total_detections: 380,
        faces_detected_count: 3,
        peak_faces_count: 2,
        avg_age: 26.4,
        primary_expression: 'Happy',
        dominant_sex_category: 'Female',
        expression_breakdown: { Happy: 65, Neutral: 28, Surprised: 7 },
        age_distribution: { '18-24': 1, '25-34': 2 },
        sex_distribution: { Female: 2, Male: 1 },
      });
      fetchDashboardData();
    } catch (e) {
      console.error('Error seeding session:', e);
    }
  };

  // Format chart data
  const ageChartData = analytics?.age_distribution
    ? Object.entries(analytics.age_distribution).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  const expressionChartData = analytics?.expression_breakdown
    ? Object.entries(analytics.expression_breakdown)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: EXPRESSION_COLORS[name.toLowerCase()] || '#14b8a6',
        }))
    : [];

  const totalFaces = analytics?.total_faces_analyzed || 0;
  const avgAge = analytics?.overall_avg_age ? `${analytics.overall_avg_age} yrs` : 'N/A';
  const topExpr = analytics?.most_common_expression || 'Neutral';
  const totalSessions = analytics?.total_sessions || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Analytics Overview
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono">
              Live Edge
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Welcome back, {user?.name || 'Researcher'}. In-browser camera telemetry and aggregated estimates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-white/10 hover:border-teal-500/30 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          <button
            onClick={() => onNavigate('live')}
            className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.35)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Launch Live Camera</span>
          </button>
        </div>
      </div>

      {/* Ethical AI & Privacy Reminder */}
      <DisclaimerBadge />

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Faces Detected"
          value={totalFaces}
          subtext="Total unique face profiles analyzed"
          icon={Users}
          color="teal"
          badge={totalFaces > 0 ? '+ Active' : 'Ready'}
        />

        <StatCard
          title="Avg Estimated Age"
          value={avgAge}
          subtext="Aggregated visual age approximation"
          icon={Activity}
          color="blue"
          badge="Approx. Range"
        />

        <StatCard
          title="Most Detected Expression"
          value={topExpr}
          subtext="Predominant visual pattern estimate"
          icon={Smile}
          color="amber"
          badge="Surface Pattern"
        />

        <StatCard
          title="Analysis Sessions"
          value={totalSessions}
          subtext="Saved privacy-safe telemetry logs"
          icon={Clock}
          color="purple"
          badge={`${analytics?.avg_session_duration_seconds || 0}s avg`}
        />
      </div>

      {/* Quick Launch Banner for Live Camera */}
      <div className="glass-panel p-6 rounded-3xl border border-teal-500/20 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-950 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-mono">
            <Sparkles className="w-3 h-3" />
            <span>Real-Time Webcam Inference</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Ready to perform real-time facial analytics?
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Detect faces, estimate age ranges, evaluate facial expressions, and classify visual sex categories locally on your device with high frame rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('live')}
            className="px-6 py-3 rounded-xl font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all cursor-pointer"
          >
            <span>Start Camera Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Charts Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Groups Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Age-Group Distribution (AI Estimates)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Approximate</span>
          </div>

          <div className="h-64 w-full">
            {ageChartData.length > 0 && ageChartData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData}>
                  <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-2">
                <p>No telemetry recorded yet in this session.</p>
                <button
                  onClick={handleSeedSampleSession}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-teal-300 hover:border-teal-500/40 text-xs"
                >
                  Load Sample Data
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expressions Breakdown */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-400" />
              Detected Expressions Breakdown
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Surface Pattern</span>
          </div>

          <div className="h-64 w-full">
            {expressionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expressionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expressionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-2">
                <p>No expression telemetry recorded yet.</p>
                <button
                  onClick={handleSeedSampleSession}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-teal-300 hover:border-teal-500/40 text-xs"
                >
                  Load Sample Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions List Preview */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Analysis Sessions</h3>
            <p className="text-xs text-slate-400">
              Only non-sensitive session metadata and statistical summaries are stored.
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {analytics?.recent_sessions && analytics.recent_sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Faces Analyzed</th>
                  <th className="py-3 px-4">Avg Age (Est)</th>
                  <th className="py-3 px-4">Top Expression</th>
                  <th className="py-3 px-4">Dominant Sex</th>
                  <th className="py-3 px-4">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {analytics.recent_sessions.slice(0, 5).map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{sess.session_name}</td>
                    <td className="py-3 px-4 font-mono">{sess.duration_seconds}s</td>
                    <td className="py-3 px-4 font-mono text-teal-300">{sess.faces_detected_count}</td>
                    <td className="py-3 px-4 font-mono">{sess.avg_age ? `${sess.avg_age}y` : 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-200">
                        {sess.primary_expression}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{sess.dominant_sex_category}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(sess.created_at).toLocaleDateString()} {new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs">No analysis sessions saved yet. Start your first camera session!</p>
            <button
              onClick={() => onNavigate('live')}
              className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/30 transition-all"
            >
              Start Live Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
