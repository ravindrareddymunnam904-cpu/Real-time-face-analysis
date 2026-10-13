import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Smile,
  Users,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Download,
} from 'lucide-react';
import DisclaimerBadge from '../components/DisclaimerBadge';
import { api } from '../api/client';
import { EXPRESSION_COLORS } from '../utils/faceDetection';

const SEX_COLORS = {
  Male: '#38bdf8',       // sky blue
  Female: '#ec4899',     // pink
  Undetermined: '#94a3b8' // slate
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const data = await api.analytics.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.warn('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // 1. Age-group distribution data
  const ageData = analytics?.age_distribution
    ? Object.entries(analytics.age_distribution).map(([range, count]) => ({
      ageGroup: range,
      count: count,
    }))
    : [];

  // 2. Detected Expressions data
  const expressionData = analytics?.expression_breakdown
    ? Object.entries(analytics.expression_breakdown).map(([name, count]) => ({
      name,
      count,
      fill: EXPRESSION_COLORS[name.toLowerCase()] || '#14b8a6',
    }))
    : [];

  // 3. AI-estimated sex-category distribution data
  const sexData = analytics?.sex_distribution
    ? Object.entries(analytics.sex_distribution).map(([category, count]) => ({
      name: category,
      value: count,
      fill: SEX_COLORS[category] || '#14b8a6',
    }))
    : [];

  // 4. Session Timeline trend data
  const timelineData = analytics?.recent_sessions
    ? [...analytics.recent_sessions].reverse().map((sess, idx) => ({
      session: `#${idx + 1}`,
      name: sess.session_name,
      faces: sess.faces_detected_count,
      peakFaces: sess.peak_faces_count,
      duration: sess.duration_seconds,
      avgAge: sess.avg_age,
    }))
    : [];

  // Export summary report
  const handleExportSummary = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `face_analytics_summary_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Statistical Analytics
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono">
              Aggregated Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual distributions derived from local face detection sessions. No biometrics or images stored.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white border border-white/10 hover:border-teal-500/30 transition-all cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          <button
            onClick={handleExportSummary}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold glass-panel border border-white/10 hover:border-teal-500/40 text-slate-200 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Export Analytics JSON</span>
          </button>
        </div>
      </div>

      <DisclaimerBadge />

      {/* Summary Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-slate-400 font-mono uppercase">Sessions Analyzed</span>
          <div className="text-2xl font-black text-white mt-1">{analytics?.total_sessions || 0}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-slate-400 font-mono uppercase">Total Face Samples</span>
          <div className="text-2xl font-black text-teal-400 mt-1">{analytics?.total_faces_analyzed || 0}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-slate-400 font-mono uppercase">Predominant Pattern</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{analytics?.most_common_expression || 'None'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-slate-400 font-mono uppercase">Overall Mean Age</span>
          <div className="text-2xl font-black text-cyan-400 mt-1">{analytics?.overall_avg_age ? `${analytics.overall_avg_age}y` : 'N/A'}</div>
        </div>
      </div>

      {/* 2x2 Grid of Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Age-Group Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <span>Age-Group Distribution</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">AI Visual Approximation</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ageGroup" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Samples" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400">
            Categorized into approximate demographic bands. Note that exact age is never claimed.
          </p>
        </div>

        {/* 2. Detected Expressions Breakdown */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Smile className="w-4 h-4 text-emerald-400" />
              <span>Detected Facial Expressions</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Surface Model Classification</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expressionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {expressionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400">
            Evaluated via neural feature classification; describes visual patterns, not psychological feelings.
          </p>
        </div>

        {/* 3. AI-Estimated Sex Category Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              <span>AI-Estimated Sex Category Distribution</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Visual Category Estimate</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {sexData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sexData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sexData.map((entry, index) => (
                      <Cell key={`sex-cell-${index}`} fill={entry.fill} />
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No sex category telemetry recorded yet.</p>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Model estimate derived purely from visual training heuristics; does not represent gender identity.
          </p>
        </div>

        {/* 4. Faces Detected Over Analysis Sessions */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Face Count Trends (Recent Sessions)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Session Volume</span>
          </div>

          <div className="h-72 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorFaces" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="session" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="faces"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorFaces)"
                    name="Faces Recorded"
                  />
                  <Area
                    type="monotone"
                    dataKey="peakFaces"
                    stroke="#2dd4bf"
                    fillOpacity={0}
                    strokeDasharray="4 4"
                    name="Peak Simultaneous"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No session timeline available yet.
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Displays concurrent and cumulative face encounters logged across analysis runs.
          </p>
        </div>
      </div>
    </div>
  );
}
