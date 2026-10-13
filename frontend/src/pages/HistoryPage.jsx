import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Download,
  Eye,
  Calendar,
  Clock,
  Users,
  Smile,
  ShieldCheck,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  Filter,
  Search,
  UserCheck,
} from 'lucide-react';
import DisclaimerBadge from '../components/DisclaimerBadge';
import { api } from '../api/client';
import { EXPRESSION_COLORS, EXPRESSION_EMOJIS, getDemoFaceThumbnail } from '../utils/faceDetection';

export default function HistoryPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('faces'); // 'faces' or 'sessions'
  const [sessions, setSessions] = useState([]);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Filters for Faces Gallery
  const [expressionFilter, setExpressionFilter] = useState('ALL');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsData, facesData] = await Promise.all([
        api.sessions.getSessions(),
        api.faces.getAll(),
      ]);
      setSessions(sessionsData || []);
      setFaces(facesData || []);
    } catch (err) {
      console.warn('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Seed sample faces if empty for presentation
  const handleSeedSampleFaces = async () => {
    try {
      await api.sessions.saveSession({
        session_name: 'Face Analytics Evaluation Demo',
        duration_seconds: 120,
        total_detections: 240,
        faces_detected_count: 3,
        peak_faces_count: 2,
        avg_age: 25.3,
        primary_expression: 'Happy',
        dominant_sex_category: 'Female',
        expression_breakdown: { Happy: 60, Neutral: 35, Surprised: 5 },
        age_distribution: { '18-24': 1, '25-34': 2 },
        sex_distribution: { Female: 2, Male: 1 },
        detected_faces: [
          {
            person_label: 'Person 1',
            age_range: '18–24',
            sex_category: 'Male',
            expression: 'Happy',
            confidence: 94,
            image_thumbnail: getDemoFaceThumbnail(1, 'Happy'),
          },
          {
            person_label: 'Person 2',
            age_range: '25–34',
            sex_category: 'Female',
            expression: 'Neutral',
            confidence: 91,
            image_thumbnail: getDemoFaceThumbnail(2, 'Neutral'),
          },
          {
            person_label: 'Person 3',
            age_range: '25–34',
            sex_category: 'Female',
            expression: 'Surprised',
            confidence: 88,
            image_thumbnail: getDemoFaceThumbnail(4, 'Surprised'),
          },
        ],
      });
      fetchData();
    } catch (e) {
      console.error('Error seeding faces:', e);
    }
  };

  const handleClearAll = async () => {
    setDeleting(true);
    try {
      await api.sessions.clearSessions();
      setSessions([]);
      setFaces([]);
      setShowClearConfirm(false);
      setStatusMessage('History successfully cleared. All detected faces and session records removed.');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      console.error('Error clearing history:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingleSession = async (id) => {
    try {
      await api.sessions.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleDeleteSingleFace = async (faceId) => {
    try {
      await api.faces.delete(faceId);
      setFaces((prev) => prev.filter((f) => f.id !== faceId));
    } catch (err) {
      console.error('Error deleting face:', err);
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0 && faces.length === 0) return;
    const headers = [
      'Face ID',
      'Person Label',
      'Age Range (Est)',
      'Sex Category (AI)',
      'Detected Expression',
      'Confidence %',
      'Timestamp Logged',
    ];

    const rows = faces.map((f) => [
      f.id,
      `"${f.person_label}"`,
      `"${f.age_range}"`,
      `"${f.sex_category}"`,
      `"${f.expression}"`,
      f.confidence,
      `"${f.detected_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `detected_persons_faces_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter faces list
  const filteredFaces = faces.filter((face) => {
    const matchesExp =
      expressionFilter === 'ALL' || face.expression.toUpperCase() === expressionFilter;
    const matchesSex = sexFilter === 'ALL' || face.sex_category.toUpperCase() === sexFilter;
    const matchesSearch =
      !searchQuery ||
      face.person_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      face.expression.toLowerCase().includes(searchQuery.toLowerCase()) ||
      face.age_range.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesExp && matchesSex && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              History & Detected Faces
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono">
              {faces.length} Faces Logged
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse all individual detected persons&apos; face profiles and historical analysis telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {faces.length === 0 && (
            <button
              onClick={handleSeedSampleFaces}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Load Sample Faces</span>
            </button>
          )}

          {(faces.length > 0 || sessions.length > 0) && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold glass-panel border border-white/10 hover:border-teal-500/40 text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>Export Faces CSV</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All History</span>
              </button>
            </>
          )}
        </div>
      </div>

      <DisclaimerBadge />

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs">
          {statusMessage}
        </div>
      )}

      {/* 🌟 Tab Navigation Switcher: All Persons Faces vs Session Logs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('faces')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all cursor-pointer ${
            activeTab === 'faces'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>All Persons Faces Gallery</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'faces' ? 'bg-slate-950 text-teal-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {faces.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Session Telemetry Logs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'sessions' ? 'bg-slate-950 text-teal-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {sessions.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: ALL PERSONS FACES GALLERY ================= */}
      {activeTab === 'faces' && (
        <div className="space-y-6">
          {/* Gallery Filter & Search Toolbar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search person label, expression, age..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            {/* Expression Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-mono mr-1">Expression:</span>
              {['ALL', 'HAPPY', 'NEUTRAL', 'SURPRISED', 'SAD', 'ANGRY'].map((expr) => (
                <button
                  key={expr}
                  onClick={() => setExpressionFilter(expr)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                    expressionFilter === expr
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {expr}
                </button>
              ))}
            </div>

            {/* Sex Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-mono mr-1">Sex:</span>
              {['ALL', 'MALE', 'FEMALE'].map((sex) => (
                <button
                  key={sex}
                  onClick={() => setSexFilter(sex)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                    sexFilter === sex
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {sex}
                </button>
              ))}
            </div>
          </div>

          {/* Faces Grid */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs">Loading detected faces...</div>
          ) : filteredFaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredFaces.map((face) => {
                const exprColor = EXPRESSION_COLORS[face.expression?.toLowerCase()] || '#14b8a6';
                const exprEmoji = EXPRESSION_EMOJIS[face.expression?.toLowerCase()] || '😐';

                return (
                  <div
                    key={face.id}
                    className="glass-panel p-4 rounded-3xl border border-white/10 hover:border-teal-500/40 transition-all duration-300 relative group overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                  >
                    {/* Top Person Label & Delete Button */}
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                        <span className="font-bold text-white font-mono">{face.person_label}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSingleFace(face.id)}
                        title="Remove face record"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Face Portrait / Thumbnail */}
                    <div className="relative aspect-square w-full rounded-2xl bg-slate-900 overflow-hidden mb-3.5 flex items-center justify-center border border-white/5 group-hover:border-teal-500/30 transition-colors">
                      {face.image_thumbnail ? (
                        <img
                          src={face.image_thumbnail}
                          alt={face.person_label}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-1" />
                          <span className="text-[10px] text-slate-500 font-mono">No Image Crop</span>
                        </div>
                      )}

                      {/* Floating Expression Tag */}
                      <div
                        className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-md"
                        style={{ color: exprColor }}
                      >
                        <span>{exprEmoji}</span>
                        <span>{face.expression}</span>
                      </div>

                      {/* Confidence Tag */}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-teal-300 text-[10px] font-mono border border-teal-500/30">
                        {face.confidence}% conf
                      </div>
                    </div>

                    {/* Details Table */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px]">Estimated Age:</span>
                        <span className="font-bold text-white font-mono">{face.age_range}</span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px]">Sex Category:</span>
                        <span className="font-bold text-cyan-300 font-mono">{face.sex_category}</span>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Logged:</span>
                        <span>{new Date(face.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center space-y-4 text-slate-400">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Detected Faces Found</h3>
                <p className="text-xs max-w-md mx-auto">
                  When you run the camera or demo mode, every detected person face will automatically be cataloged with their snapshot thumbnail here.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('live')}
                  className="px-5 py-2.5 rounded-xl font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 text-xs transition-all cursor-pointer"
                >
                  Start Live Camera
                </button>
                <button
                  onClick={handleSeedSampleFaces}
                  className="px-4 py-2.5 rounded-xl font-semibold bg-slate-800 text-teal-300 border border-teal-500/30 hover:bg-slate-700 text-xs transition-all cursor-pointer"
                >
                  Load Sample Face Profiles
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: SESSION TELEMETRY LOGS ================= */}
      {activeTab === 'sessions' && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Loading session records...
            </div>
          ) : sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Session Name</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Faces Logged</th>
                    <th className="py-3.5 px-4">Simultaneous</th>
                    <th className="py-3.5 px-4">Avg Age (Est)</th>
                    <th className="py-3.5 px-4">Top Expression</th>
                    <th className="py-3.5 px-4">Dominant Sex</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{sess.session_name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{sess.duration_seconds}s</td>
                      <td className="py-3.5 px-4 font-mono text-teal-300">{sess.faces_detected_count}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{sess.peak_faces_count} peak</td>
                      <td className="py-3.5 px-4 font-mono">{sess.avg_age ? `${sess.avg_age}y` : 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-white/10 text-[11px]">
                          {sess.primary_expression}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{sess.dominant_sex_category}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(sess.created_at).toLocaleDateString()} {new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSession(sess)}
                            title="View telemetry breakdown"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingleSession(sess.id)}
                            title="Delete this record"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-white">No Session Records Yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                Completed camera sessions will display their telemetry and demographics here.
              </p>
              <button
                onClick={() => onNavigate('live')}
                className="px-4 py-2 rounded-xl font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 text-xs transition-all cursor-pointer"
              >
                Start Live Camera
              </button>
            </div>
          )}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-lg w-full shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-base">{selectedSession.session_name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  Recorded: {new Date(selectedSession.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Duration:</span>
                <span className="font-bold text-white text-sm font-mono">{selectedSession.duration_seconds} seconds</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Faces Logged:</span>
                <span className="font-bold text-teal-300 text-sm font-mono">{selectedSession.faces_detected_count}</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Estimated Avg Age:</span>
                <span className="font-bold text-white text-sm font-mono">{selectedSession.avg_age} yrs</span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400 block">Peak Simultaneous:</span>
                <span className="font-bold text-cyan-300 text-sm font-mono">{selectedSession.peak_faces_count}</span>
              </div>
            </div>

            {/* Expression Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">Expression Distribution</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(selectedSession.expression_breakdown || {}).map(([exp, count]) => (
                  <div key={exp} className="p-2 bg-slate-900/40 rounded-lg flex justify-between items-center">
                    <span className="text-slate-400">{exp}:</span>
                    <span className="font-mono text-slate-200">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-3xl border border-red-500/30 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base">Clear All Historical Faces & Sessions?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will permanently delete all logged detected person face profiles and session summaries from your account.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
