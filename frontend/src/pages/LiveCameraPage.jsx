import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Power,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertTriangle,
  Users,
  ShieldCheck,
  Save,
  Clock,
  Radio,
  RefreshCw,
  Cpu,
  Volume2,
  Zap,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  UserCheck,
  Smile,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import FaceCard from '../components/FaceCard';
import DisclaimerBadge from '../components/DisclaimerBadge';
import {
  loadFaceModels,
  runFaceDetection,
  generateDemoDetections,
  drawBoundingBoxes,
  areModelsLoaded,
  cropFaceThumbnail,
  getDemoFaceThumbnail,
  generateInstantPresenceDetection,
  EXPRESSION_COLORS,
  EXPRESSION_EMOJIS,
  ALL_EXPRESSIONS,
  resetFaceTracker,
} from '../utils/faceDetection';
import { speakText, playChime } from '../utils/speechService';
import { useVoice } from '../context/VoiceContext';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALL_SEVEN_EMOTIONS = [
  { key: 'happy', label: 'Happy', emoji: '😊', color: '#10b981' },
  { key: 'sad', label: 'Sad', emoji: '😢', color: '#3b82f6' },
  { key: 'angry', label: 'Angry', emoji: '😠', color: '#ef4444' },
  { key: 'surprised', label: 'Surprised', emoji: '😲', color: '#f59e0b' },
  { key: 'fearful', label: 'Fearful', emoji: '😨', color: '#a855f7' },
  { key: 'disgusted', label: 'Disgusted', emoji: '🤢', color: '#84cc16' },
  { key: 'neutral', label: 'Neutral', emoji: '😐', color: '#06b6d4' },
];

export default function LiveCameraPage({ onNavigate }) {
  const { user } = useAuth();
  const { isListening, lastCommand, speak, subscribeToCommands } = useVoice();

  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [analysisActive, setAnalysisActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modelsReady, setModelsReady] = useState(areModelsLoaded());
  const [modelStatusText, setModelStatusText] = useState('AI Models initialized');
  const [detectedPersons, setDetectedPersons] = useState([]);
  const [selectedFaceIdx, setSelectedFaceIdx] = useState(0);
  const [alternateFaceAlert, setAlternateFaceAlert] = useState(null);
  const [showAllOtherExpressions, setShowAllOtherExpressions] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [peakFaces, setPeakFaces] = useState(0);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSavedNotice, setSessionSavedNotice] = useState('');

  // Voice Narration & Spoken Subtitle States
  const [autoVoiceNarration, setAutoVoiceNarration] = useState(true);
  const [lastSpokenMessage, setLastSpokenMessage] = useState('');

  // Auto Turn-On when face is visible
  const [autoTurnOnFace, setAutoTurnOnFace] = useState(true);
  const [autoAwakenedAlert, setAutoAwakenedAlert] = useState(false);

  // Pool of unique faces logged in current session (with thumbnail crops)
  const [sessionFacesLogged, setSessionFacesLogged] = useState([]);
  const sessionFacesMapRef = useRef(new Map());

  // Telemetry aggregates for the current session
  const sessionStatsRef = useRef({
    totalFrames: 0,
    facesRecordedTotal: 0,
    peakFaces: 0,
    agesAccumulated: [],
    expressionsTally: {
      Happy: 0,
      Neutral: 0,
      Surprised: 0,
      Sad: 0,
      Angry: 0,
      Fearful: 0,
      Disgusted: 0,
    },
    sexTally: { Male: 0, Female: 0 },
  });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const durationTimerRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const lastSpokenFaceCountRef = useRef(-1);
  const lastAutoWakeTriggerRef = useRef(0);

  // Settings from user profile
  const detectionIntervalMs = user?.settings?.detection_interval_ms || 140;
  const confidenceThreshold = user?.settings?.confidence_threshold || 0.25;

  // Real-time recognition & speech narration
  const [boostedSensitivity, setBoostedSensitivity] = useState(true);
  const lastSpokenNarrationRef = useRef(0);
  const lastSpokenExprRef = useRef('');
  const lastExprChangeTimeRef = useRef(0);
  const lastActivePersonRef = useRef(null);
  const lastActivePersonTimeRef = useRef(0);

  // Short, instant verbal emotion notification
  const getInstantEmotionSpokenText = (expression) => {
    switch (expression) {
      case 'Happy':
        return 'Smiling! You appear Happy.';
      case 'Surprised':
        return 'Surprised! Wide expression detected.';
      case 'Neutral':
        return 'Neutral face.';
      case 'Sad':
        return 'Sad expression detected.';
      case 'Angry':
        return 'Angry expression detected.';
      case 'Fearful':
        return 'Fearful expression detected.';
      case 'Disgusted':
        return 'Disgusted expression detected.';
      default:
        return `${expression} expression detected.`;
    }
  };

  // Spoken voice analysis for user's face, facial expression, age, and sex
  const announceCurrentExpression = () => {
    let person = detectedPersons[selectedFaceIdx] || detectedPersons[0];
    if (!person && isDemoMode) {
      const demo = generateDemoDetections(640, 480, Date.now());
      if (demo.length > 0) person = demo[selectedFaceIdx] || demo[0];
    }

    if (!person) {
      const msg = 'No face detected in camera view right now. Look directly at the camera to detect your expressions and age.';
      speakText(msg);
      setLastSpokenMessage(msg);
      return;
    }

    const otherSummary = person.otherExpressions && person.otherExpressions[0] && person.otherExpressions[0].percent > 5
      ? ` Other noticeable expression is ${person.otherExpressions[0].name} at ${person.otherExpressions[0].percent} percent.`
      : '';
    const msg = detectedPersons.length > 1
      ? `Person ${person.personId} of ${detectedPersons.length} faces visible: expression is ${person.expression} (${person.expressionConfidence} percent confidence), estimated age ${person.ageRange}, sex ${person.sexCategory}.${otherSummary}`
      : `Face recognized! Expression is ${person.expression} with ${person.expressionConfidence} percent confidence, estimated age range ${person.ageRange}, sex category ${person.sexCategory}.${otherSummary}`;

    speakText(msg);
    setLastSpokenMessage(msg);
  };

  // Initialize Models on mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        if (!areModelsLoaded()) {
          setModelStatusText('Loading neural network weights...');
          await loadFaceModels((msg) => {
            if (isMounted) setModelStatusText(msg);
          });
        }
        if (isMounted) {
          setModelsReady(true);
          setModelStatusText('Neural models ready.');
        }
      } catch (err) {
        console.warn('Model loading issue:', err);
        if (isMounted) {
          setModelsReady(false);
          setModelStatusText('Using simulated demo pipeline or browser fallback.');
        }
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (cameraActive || isDemoMode) {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }
      durationTimerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [cameraActive, isDemoMode, sessionStartTime]);

  // Voice command integration
  useEffect(() => {
    const unsubscribe = subscribeToCommands((action) => {
      if (action === 'START_CAMERA') {
        startCamera();
      } else if (action === 'STOP_CAMERA') {
        stopCamera();
      } else if (action === 'START_ANALYSIS') {
        setAnalysisActive(true);
      } else if (action === 'STOP_ANALYSIS') {
        setAnalysisActive(false);
      } else if (action === 'ENABLE_DEMO') {
        enableDemoMode();
      } else if (action === 'DISABLE_DEMO') {
        disableDemoMode();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Start Real Camera
  const startCamera = async (isAutoSense = false) => {
    setErrorMessage('');
    setIsDemoMode(false);

    if (!modelsReady && !areModelsLoaded()) {
      try {
        setModelStatusText('Loading neural face models...');
        await loadFaceModels((msg) => setModelStatusText(msg));
        setModelsReady(true);
      } catch (e) {
        console.warn('Pre-loading face models in startCamera warning:', e);
      }
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn('Camera video play error:', e);
          }
        };
        videoRef.current.onloadeddata = async () => {
          try {
            await videoRef.current.play();
          } catch (e) {}
        };
        try {
          await videoRef.current.play();
        } catch (e) {}
      }

      resetFaceTracker();
      setSelectedFaceIdx(0);
      setCameraActive(true);
      setAnalysisActive(true);

      const greeting = isAutoSense
        ? 'Camera activated. Monitoring for your face and facial expressions.'
        : 'Camera turned on. Real-time facial analytics started.';
      speak(greeting);
      speakText(greeting);
      setLastSpokenMessage(greeting);
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in browser settings or try Demo Mode.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on your system. You can explore full features in Demo Mode.';
      }
      setErrorMessage(msg);
      setCameraActive(false);
    }
  };

  // Stop Real Camera
  const stopCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    resetFaceTracker();
    setSelectedFaceIdx(0);
    setAlternateFaceAlert(null);
    setCameraActive(false);
    setAnalysisActive(false);
    setDetectedPersons([]);
    lastActivePersonRef.current = null;
    lastActivePersonTimeRef.current = 0;

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    speak('Camera stopped.');
    // Automatically trigger saving telemetry summary if session was running
    if (sessionDuration > 2 && sessionStatsRef.current.facesRecordedTotal > 0) {
      await saveSessionRecord();
    }
  };

  // Toggle Camera Power directly
  const toggleCameraPower = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Enable Demo Mode
  const enableDemoMode = () => {
    if (cameraActive) {
      stopCamera();
    }
    setErrorMessage('');
    setIsDemoMode(true);
    setAnalysisActive(true);
    speak('Demo mode enabled.');
  };

  // Disable Demo Mode
  const disableDemoMode = () => {
    setIsDemoMode(false);
    setAnalysisActive(false);
    setDetectedPersons([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    speak('Demo mode disabled.');
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Save session record to backend with individual detected face snapshots
  const saveSessionRecord = async () => {
    if (sessionDuration === 0) return;
    setSavingSession(true);
    try {
      const stats = sessionStatsRef.current;
      const ages = stats.agesAccumulated;
      const avgAgeCalc = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 24.0;

      // Find top expression
      let topExp = 'Neutral';
      let maxExpCount = -1;
      Object.entries(stats.expressionsTally).forEach(([k, v]) => {
        if (v > maxExpCount) {
          maxExpCount = v;
          topExp = k;
        }
      });

      // Dominant sex
      const dominantSex = stats.sexTally.Female > stats.sexTally.Male ? 'Female' : 'Male';

      // Age distribution
      const ageDist = {
        '0-12': 0, '13-17': 0, '18-24': 0,
        '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0
      };
      ages.forEach((age) => {
        if (age < 13) ageDist['0-12']++;
        else if (age < 18) ageDist['13-17']++;
        else if (age < 25) ageDist['18-24']++;
        else if (age < 35) ageDist['25-34']++;
        else if (age < 45) ageDist['35-44']++;
        else if (age < 55) ageDist['45-54']++;
        else ageDist['55+']++;
      });

      // Distinct faces logged
      const facesList = Array.from(sessionFacesMapRef.current.values());

      await api.sessions.saveSession({
        session_name: isDemoMode ? 'Demo Presentation Session' : 'Live Camera Session',
        duration_seconds: sessionDuration,
        total_detections: stats.totalFrames,
        faces_detected_count: facesList.length || stats.facesRecordedTotal,
        peak_faces_count: stats.peakFaces || 1,
        avg_age: roundToOne(avgAgeCalc),
        primary_expression: topExp,
        dominant_sex_category: dominantSex,
        expression_breakdown: stats.expressionsTally,
        age_distribution: ageDist,
        sex_distribution: stats.sexTally,
        detected_faces: facesList,
      });

      setSessionSavedNotice(`Session and ${facesList.length} detected face profiles saved to History.`);
      setTimeout(() => setSessionSavedNotice(''), 5000);
    } catch (err) {
      console.warn('Failed to save session:', err);
    } finally {
      setSavingSession(false);
    }
  };

  const roundToOne = (num) => Math.round(num * 10) / 10;

  // Main Detection Loop (Continuous RequestAnimationFrame with throttling)
  useEffect(() => {
    let active = true;

    const runLoop = async (time) => {
      if (!active) return;

      const elapsedSinceLast = time - lastDetectionTimeRef.current;

      // Notice: If camera is on, we always run lightweight detection so Auto-Turn-On can awaken analysis!
      const shouldCheck = (cameraActive || isDemoMode) && elapsedSinceLast >= detectionIntervalMs;

      if (shouldCheck) {
        lastDetectionTimeRef.current = time;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        // Case 1: DEMO MODE
        if (isDemoMode && canvas) {
          const w = canvas.width || 640;
          const h = canvas.height || 480;
          const demoResults = generateDemoDetections(w, h, Date.now());

          setDetectedPersons(demoResults);
          drawBoundingBoxes(canvas, demoResults, { isDemo: true });

          // Accumulate stats and save demo faces into gallery pool
          updateSessionStats(demoResults);
          recordFacesToPool(demoResults);

          // Instant real-time voice narration on demo expression changes
          if (autoVoiceNarration && demoResults.length > 0) {
            const activePerson = demoResults[selectedFaceIdx] || demoResults[0];
            const now = Date.now();
            if (activePerson.expression !== lastSpokenExprRef.current && (now - lastExprChangeTimeRef.current > 1100)) {
              lastExprChangeTimeRef.current = now;
              lastSpokenExprRef.current = activePerson.expression;
              lastSpokenNarrationRef.current = now;
              const shortMsg = demoResults.length > 1
                ? `Person ${activePerson.personId} is now ${activePerson.expression}.`
                : getInstantEmotionSpokenText(activePerson.expression);
              speakText(shortMsg);
              setLastSpokenMessage(shortMsg);
            }
          }
        }
        // Case 2: LIVE CAMERA INFERENCE
        else if (cameraActive && video && video.readyState >= 2 && video.videoWidth > 0 && canvas) {
          // Align canvas dimensions with video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          try {
            const results = await runFaceDetection(video, {
              minConfidence: boostedSensitivity ? 0.05 : 0.08,
              fallbackInstant: false, // Accurate real-time face detection without synthetic phantom faces
            });

            if (active) {
              const facesFound = results.length > 0;
              if (facesFound) {
                lastActivePersonRef.current = results[selectedFaceIdx] || results[0];
                lastActivePersonTimeRef.current = Date.now();
              }

              // Check if an alternate face arrived in this frame
              const altFace = results.find((r) => r.isAlternateOrNew);
              if (altFace) {
                setAlternateFaceAlert(altFace);
                setTimeout(() => setAlternateFaceAlert(null), 4500);
                const altIdx = results.findIndex((r) => r.personId === altFace.personId);
                if (altIdx !== -1) {
                  setSelectedFaceIdx(altIdx);
                }
                if (autoVoiceNarration) {
                  const now = Date.now();
                  if (now - lastSpokenNarrationRef.current > 3500) {
                    lastSpokenNarrationRef.current = now;
                    const altVoiceMsg = `Alternate face detected! Person ${altFace.personId} is ${altFace.expression}, estimated age range ${altFace.ageRange}.`;
                    speakText(altVoiceMsg);
                    setLastSpokenMessage(altVoiceMsg);
                  }
                }
              }

              // Auto turn-on analysis when face is visible
              if (facesFound && autoTurnOnFace) {
                if (!analysisActive) {
                  const now = Date.now();
                  if (now - lastAutoWakeTriggerRef.current > 4000) {
                    lastAutoWakeTriggerRef.current = now;
                    setAnalysisActive(true);
                    setAutoAwakenedAlert(true);
                    const primary = results[0];
                    const wakeMsg = `Face visible! Recognized expression is ${primary.expression}. Camera analysis turned on automatically.`;
                    speakText(wakeMsg);
                    setLastSpokenMessage(wakeMsg);
                    setTimeout(() => setAutoAwakenedAlert(false), 4500);
                  }
                }
              }

              if (analysisActive || facesFound) {
                setDetectedPersons(results);
                drawBoundingBoxes(canvas, results, { isDemo: false });
                updateSessionStats(results);
                recordFacesToPool(results);

                // Real-time voice narration: Instantly announce expression changes!
                if (autoVoiceNarration && results.length > 0 && !altFace) {
                  const activePerson = results[selectedFaceIdx] || results[0];
                  const now = Date.now();
                  const isExprChanged = activePerson.expression !== lastSpokenExprRef.current;

                  // Priority 1: Instant announcement when facial expression changes!
                  if (isExprChanged && (now - lastExprChangeTimeRef.current > 1100)) {
                    lastExprChangeTimeRef.current = now;
                    lastSpokenExprRef.current = activePerson.expression;
                    lastSpokenNarrationRef.current = now;
                    const instantMsg = results.length > 1
                      ? `Person ${activePerson.personId} is now ${activePerson.expression}.`
                      : getInstantEmotionSpokenText(activePerson.expression);
                    speakText(instantMsg);
                    setLastSpokenMessage(instantMsg);
                  }
                  // Priority 2: Periodic voice update when face is steady (every 12 seconds)
                  else if (now - lastSpokenNarrationRef.current > 12000 && !lastSpokenExprRef.current) {
                    lastSpokenNarrationRef.current = now;
                    lastSpokenExprRef.current = activePerson.expression;
                    const otherNote = activePerson.otherExpressions && activePerson.otherExpressions[0] && activePerson.otherExpressions[0].percent > 8
                      ? ` with noticeable ${activePerson.otherExpressions[0].name}.`
                      : '.';
                    const exprMsg = results.length > 1
                      ? `${results.length} faces visible. Person ${activePerson.personId} is ${activePerson.expression}, estimated age range ${activePerson.ageRange}${otherNote}`
                      : `Face recognized! You appear ${activePerson.expression}, estimated age range ${activePerson.ageRange}${otherNote}`;
                    speakText(exprMsg);
                    setLastSpokenMessage(exprMsg);
                  }
                }
              } else {
                // Analysis paused and no active face in view
                setDetectedPersons([]);
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }
          } catch (detErr) {
            console.warn('Detection error during frame:', detErr);
          }
        }
      }

      if (active) {
        detectionLoopRef.current = requestAnimationFrame(runLoop);
      }
    };

    detectionLoopRef.current = requestAnimationFrame(runLoop);

    return () => {
      active = false;
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current);
    };
  }, [analysisActive, cameraActive, isDemoMode, autoTurnOnFace, autoVoiceNarration, detectionIntervalMs, confidenceThreshold, selectedFaceIdx, speak]);

  // Update session stats
  const updateSessionStats = (persons) => {
    if (!persons || persons.length === 0) return;
    const stats = sessionStatsRef.current;
    stats.totalFrames++;

    if (persons.length > stats.peakFaces) {
      stats.peakFaces = persons.length;
      setPeakFaces(persons.length);
    }

    persons.forEach((p) => {
      stats.facesRecordedTotal++;
      if (p.rawAge) stats.agesAccumulated.push(p.rawAge);
      if (p.expression && stats.expressionsTally[p.expression] !== undefined) {
        stats.expressionsTally[p.expression]++;
      }
      if (p.sexCategory && stats.sexTally[p.sexCategory] !== undefined) {
        stats.sexTally[p.sexCategory]++;
      }
    });
  };

  // Record individual detected face profiles with thumbnails for History Gallery & Alternating Reel
  const recordFacesToPool = (persons) => {
    if (!persons || persons.length === 0) return;
    let mapUpdated = false;

    persons.forEach((p) => {
      const key = `person_${p.personId}`;
      const existing = sessionFacesMapRef.current.get(key);
      if (!existing || (!existing.image_thumbnail && p.imageThumbnail) || p.confidence > (existing.confidence || 0)) {
        sessionFacesMapRef.current.set(key, {
          person_label: `Person ${p.personId}`,
          person_id: p.personId,
          age_range: p.ageRange,
          raw_age: p.rawAge,
          sex_category: p.sexCategory,
          expression: p.expression,
          expression_emoji: p.expressionEmoji,
          expression_confidence: p.expressionConfidence,
          expressions_all: p.expressionsAll || {},
          other_expressions: p.otherExpressions || [],
          confidence: p.confidence,
          image_thumbnail: p.imageThumbnail || existing?.image_thumbnail || '',
          detected_at: existing?.detected_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        mapUpdated = true;
      }
    });

    if (mapUpdated) {
      setSessionFacesLogged(Array.from(sessionFacesMapRef.current.values()));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Derive active face profile for the Down-Camera Live Display
  const displayPerson =
    detectedPersons.length > 0
      ? detectedPersons[selectedFaceIdx] || detectedPersons[0]
      : cameraActive && videoRef.current && (Date.now() - lastActivePersonTimeRef.current < 1500) && lastActivePersonRef.current
      ? lastActivePersonRef.current
      : isDemoMode
      ? (generateDemoDetections(640, 480, Date.now())[selectedFaceIdx] || generateDemoDetections(640, 480, Date.now())[0])
      : null;

  return (
    <div
      ref={containerRef}
      className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 ${
        isFullscreen ? 'bg-slate-950 p-6 h-screen overflow-y-auto' : ''
      }`}
    >
      {/* Primary Camera Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Live Camera
            </h1>

            {/* Camera Status Badge */}
            {cameraActive ? (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                CAMERA ON
              </span>
            ) : isDemoMode ? (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono font-bold animate-pulse">
                DEMO SIMULATION ON
              </span>
            ) : (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                CAMERA OFF
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time face detection, approximate age grouping, and expression telemetry.
          </p>
        </div>

        {/* Master Camera On/Off & Auto-Sense Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 🌟 1. Prominent Camera ON / OFF Button */}
          <button
            onClick={toggleCameraPower}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              cameraActive
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:scale-105'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}</span>
          </button>

          {/* 🌟 2. Auto Turn-On When Face Is Visible Toggle */}
          <button
            onClick={() => setAutoTurnOnFace(!autoTurnOnFace)}
            title="When active, analysis turns on automatically whenever a face enters the frame"
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              autoTurnOnFace
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:border-slate-700'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoTurnOnFace ? 'text-teal-400 animate-bounce' : 'text-slate-500'}`} />
            <span>Auto Turn-On on Face: {autoTurnOnFace ? 'ON' : 'OFF'}</span>
          </button>

          {/* Direct link to View All Persons Faces in History */}
          <button
            onClick={() => onNavigate('history')}
            className="px-3.5 py-2 rounded-2xl text-xs font-semibold glass-panel border border-white/10 hover:border-teal-500/40 text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>Faces History</span>
            {sessionFacesLogged.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                {sessionFacesLogged.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ⚡ Auto-Awakened Notification Alert Banner */}
      {autoAwakenedAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="font-semibold">
              Person face visible! Camera analysis turned ON automatically.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
            AUTO-ACTIVATED
          </span>
        </div>
      )}

      {/* 👤 Alternate Face Notification Alert Banner */}
      {alternateFaceAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border border-indigo-500/50 text-indigo-200 text-xs flex items-center justify-between shadow-[0_0_25px_rgba(99,102,241,0.35)] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="font-semibold">
              Alternate face detected! Now tracking Person {alternateFaceAlert.personId} ({alternateFaceAlert.expression} {alternateFaceAlert.expressionEmoji}, {alternateFaceAlert.ageRange} yrs).
            </span>
          </div>
          <span className="text-[10px] font-mono bg-indigo-500/30 px-2.5 py-0.5 rounded text-indigo-200 font-bold border border-indigo-500/40">
            ALTERNATE FACE ACTIVE
          </span>
        </div>
      )}

      {/* Voice Assistant Notification Pill if listening */}
      {isListening && (
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Voice Control: Listening for commands (&quot;Start camera&quot;, &quot;Stop analysis&quot;, &quot;Enable demo mode&quot;)...</span>
          </div>
          {lastCommand && (
            <span className="font-mono bg-emerald-900/40 px-2 py-0.5 rounded">
              Last: &quot;{lastCommand}&quot;
            </span>
          )}
        </div>
      )}

      {/* Error / Alert banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={enableDemoMode}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold hover:bg-amber-500/30 shrink-0 transition-all cursor-pointer"
          >
            Switch to Demo Mode
          </button>
        </div>
      )}

      {sessionSavedNotice && (
        <div className="p-3 rounded-2xl bg-teal-950/50 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
          <Save className="w-4 h-4 text-teal-400" />
          <span>{sessionSavedNotice}</span>
        </div>
      )}

      {/* Main Analysis Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Stream / Canvas HUD */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden relative shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            {/* Top Viewport Header */}
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraActive || isDemoMode
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-red-500'
                  }`}
                />
                <span className="font-mono text-slate-300 font-semibold">
                  {isDemoMode
                    ? 'STREAM: SIMULATED_DATASET.DEMO'
                    : cameraActive
                    ? 'STREAM: WEBCAM_HARDWARE_ACTIVE'
                    : 'STREAM: CAMERA POWER OFF'}
                </span>
                {autoTurnOnFace && (
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Smart Presence Wake
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(cameraActive || isDemoMode) && (
                  <span className="text-[11px] font-mono text-slate-400 mr-2">
                    {Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, '0')}
                  </span>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Video + Canvas Reticle Container */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* Laser scanner animation when running */}
              {(cameraActive || isDemoMode) && analysisActive && (
                <div className="scanner-laser" />
              )}

              {/* HTML5 Video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  cameraActive && !isDemoMode ? 'block' : 'hidden'
                }`}
              />

              {/* Canvas element for high-performance cybernetic bounding boxes & HUD */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
              />

              {/* Standby State when camera is OFF */}
              {!cameraActive && !isDemoMode && (
                <div className="text-center p-8 space-y-5 max-w-md relative z-20">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-white/10 flex items-center justify-center mx-auto text-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
                    <Camera className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Camera is Turned Off</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Click <strong>Turn Camera On</strong> to start the webcam feed. If &quot;Auto Turn-On&quot; is enabled, live facial analysis engages automatically as soon as your face is visible.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => startCamera(false)}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:opacity-95 shadow-[0_0_25px_rgba(20,184,166,0.4)] transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <Power className="w-4 h-4" />
                      <span>Turn Camera On</span>
                    </button>
                    <button
                      onClick={enableDemoMode}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer text-xs"
                    >
                      Try Demo Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Live Face Recognition & Expression Announcement HUD */}
              {(cameraActive || isDemoMode) && detectedPersons.length > 0 && (() => {
                const activeP = detectedPersons[selectedFaceIdx] || detectedPersons[0];
                return (
                  <div className="absolute top-3 left-3 right-3 z-30 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-teal-500/50 flex flex-wrap items-center justify-between gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)] animate-in fade-in">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <div className="text-xs flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white">
                          Person {activeP.personId}:
                        </span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {activeP.expression} {activeP.expressionEmoji}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          ({activeP.expressionConfidence}%)
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-teal-300 font-mono text-xs">
                          Age: {activeP.ageRange}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 text-xs">
                          Sex: {activeP.sexCategory}
                        </span>
                        {activeP.isAlternateOrNew && (
                          <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded font-bold">
                            ALT FACE
                          </span>
                        )}
                        {detectedPersons.length > 1 && (
                          <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                            {detectedPersons.length} faces visible
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={announceCurrentExpression}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:opacity-95 shadow-md transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Speak Expression 🗣️</span>
                    </button>
                  </div>
                );
              })()}

              {/* Helpful Guidance when Camera is ON but no face detected */}
              {cameraActive && !isDemoMode && detectedPersons.length === 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-2xl bg-slate-950/85 border border-white/10 text-[11px] text-slate-300 flex items-center gap-3 backdrop-blur-md shadow-lg">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Looking for your face... Look straight into camera.
                  </span>
                  <button
                    onClick={() => setBoostedSensitivity(!boostedSensitivity)}
                    className="text-teal-400 font-bold underline cursor-pointer ml-1"
                  >
                    {boostedSensitivity ? 'Sensitivity: Boosted (Active)' : 'Boost Sensitivity'}
                  </button>
                </div>
              )}

              {/* Demo Mode Background graphic */}
              {isDemoMode && (
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3 pointer-events-none opacity-40">
                  <Cpu className="w-16 h-16 text-amber-400 animate-pulse" />
                  <p className="text-xs font-mono text-amber-300">
                    SIMULATED NEURAL INFERENCE RUNNING
                  </p>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 🌟 DIRECTLY BELOW CAMERA FEED: LIVE DETECTED EMOTION DISPLAY 🌟 */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 bg-slate-950/95 border-t border-white/10 space-y-4 relative">
              {errorMessage ? (
                /* Camera Error State */
                <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-red-200">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">Camera Access Issue</span>
                      <span className="text-slate-300">{errorMessage}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startCamera(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-teal-500/40 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Retry Camera
                    </button>
                    <button
                      onClick={enableDemoMode}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 cursor-pointer"
                    >
                      Try Demo Mode
                    </button>
                  </div>
                </div>
              ) : (cameraActive || isDemoMode) ? (
                displayPerson ? (
                  /* Active Face Detected State */
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    {/* Header bar: Live Status + Facial Telemetry Attributes */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                          Detected Emotion
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                          LIVE MODEL INFERENCE
                        </span>
                      </div>

                      {/* Preserved Telemetry: Age Cohort & Perceived Gender Presentation */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-300">
                        <span className="text-teal-400 font-bold">Person #{displayPerson.personId}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-teal-300 font-semibold">🎂 Age: {displayPerson.ageRange}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-indigo-300 font-semibold">👤 Sex: {displayPerson.sexCategory} ({displayPerson.sexConfidence}%)</span>
                      </div>
                    </div>

                    {/* Primary Highlight Card for Currently Active Emotion */}
                    <div
                      className="p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      style={{
                        borderColor: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                        background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95), ${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}20)`,
                        boxShadow: `0 0 25px ${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}25`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-5xl sm:text-6xl select-none animate-bounce" role="img" aria-label={displayPerson.expression}>
                          {displayPerson.expressionEmoji}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className="text-3xl sm:text-4xl font-black tracking-tight uppercase"
                              style={{ color: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981' }}
                            >
                              {displayPerson.expression}
                            </span>
                            <span
                              className="px-3 py-1 rounded-full font-mono font-bold text-sm border shadow-sm"
                              style={{
                                backgroundColor: `${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}25`,
                                color: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                                borderColor: `${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}60`,
                              }}
                            >
                              {displayPerson.expressionConfidence}% Confidence
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            Facial expression detected via client-side neural network. Updates instantly in real time without refreshing.
                          </p>
                        </div>
                      </div>

                      {/* Primary Certainty Gauge */}
                      <div className="w-full md:w-64 space-y-1.5 shrink-0">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>Model Certainty</span>
                          <span className="font-bold text-white font-mono">{displayPerson.expressionConfidence}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${displayPerson.expressionConfidence}%`,
                              backgroundColor: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                              boxShadow: `0 0 12px ${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}80`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Real-Time All 7 Emotions Spectrum Meters */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="font-semibold uppercase tracking-wider text-slate-300">
                          All 7 Emotions Spectrum (Real-Time Live Updates):
                        </span>
                        <span className="hidden sm:inline-block text-[10px] text-slate-400">
                          Happy • Sad • Angry • Surprised • Fearful • Disgusted • Neutral
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {ALL_SEVEN_EMOTIONS.map((emo) => {
                          const isDominant = emo.key === (displayPerson.expression || '').toLowerCase();
                          const pct = displayPerson.expressionsAll?.[emo.key] || 0;
                          return (
                            <div
                              key={emo.key}
                              className={`p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                                isDominant
                                  ? 'bg-slate-900 border-2 shadow-lg scale-[1.02]'
                                  : 'bg-slate-900/60 border-white/5 opacity-75 hover:opacity-100'
                              }`}
                              style={isDominant ? { borderColor: emo.color, boxShadow: `0 0 15px ${emo.color}35` } : {}}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="flex items-center gap-1 font-semibold text-white">
                                  <span>{emo.emoji}</span>
                                  <span className="text-[11px]">{emo.label}</span>
                                </span>
                                <span className="font-mono font-bold text-xs" style={{ color: emo.color }}>
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-200"
                                  style={{
                                    width: `${Math.max(2, pct)}%`,
                                    backgroundColor: emo.color,
                                    opacity: isDominant ? 1 : 0.5,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Camera is ON but NO Face Detected State */
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <span>No Face Detected in Camera Feed</span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                      Please position your face directly in front of the camera with clear lighting. The neural model will automatically detect and update Happy, Sad, Angry, Surprised, Fearful, Disgusted, and Neutral expressions in real time.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Status: Scanning for Face Presence</span>
                      <span>•</span>
                      <button
                        onClick={() => setBoostedSensitivity(!boostedSensitivity)}
                        className="text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        {boostedSensitivity ? 'Sensitivity: Boosted (Active)' : 'Boost Detector Sensitivity'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* Camera is OFF Standby State */
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <CameraOff className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Camera feed is currently turned off. Emotion detection is on standby.</span>
                  </div>
                  <button
                    onClick={() => startCamera(false)}
                    className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all cursor-pointer shrink-0"
                  >
                    Turn Camera On
                  </button>
                </div>
              )}
            </div>

            {/* Viewport Control Bar */}
            <div className="p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Camera Power Button */}
                <button
                  onClick={toggleCameraPower}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    cameraActive
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                      : 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}</span>
                </button>

                {/* Pause / Resume Analysis */}
                {(cameraActive || isDemoMode) && (
                  <button
                    onClick={() => setAnalysisActive(!analysisActive)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      analysisActive
                        ? 'bg-slate-800 text-slate-200 border-white/10 hover:border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {analysisActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pause Analysis</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resume Analysis</span>
                      </>
                    )}
                  </button>
                )}

                {/* Speak Expression Button */}
                {(cameraActive || isDemoMode) && (
                  <button
                    onClick={announceCurrentExpression}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Speak Expression</span>
                  </button>
                )}

                {/* Sensitivity Boost Button */}
                <button
                  onClick={() => setBoostedSensitivity(!boostedSensitivity)}
                  title="Increases neural detector sensitivity in dim lighting or tilted angles"
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    boostedSensitivity
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sensitivity: {boostedSensitivity ? 'High (Boosted)' : 'Normal'}</span>
                </button>

                {/* Demo Mode Toggle */}
                <button
                  onClick={isDemoMode ? disableDemoMode : enableDemoMode}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDemoMode
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-amber-500/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isDemoMode ? 'Disable Demo' : 'Demo Mode'}</span>
                </button>
              </div>

              {/* Save Session Record Button */}
              {(cameraActive || isDemoMode) && (
                <button
                  onClick={saveSessionRecord}
                  disabled={savingSession}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-white/10 text-teal-300 hover:border-teal-500/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSession ? 'Saving...' : `Save Session (${sessionFacesLogged.length} Faces)`}</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 🌟 DOWN THE CAMERA: INSTANT REAL-TIME FACE ANALYTICS (EXPRESSION, SEX, AGE) 🌟 */}
          {/* ========================================================================= */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border-2 border-teal-500/50 bg-slate-900/90 shadow-[0_15px_45px_rgba(20,184,166,0.2)] space-y-5 relative overflow-hidden">
            {/* Ambient background glow accents */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <span>Down-Camera Live Output</span>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                      {cameraActive || isDemoMode ? 'LIVE REAL-TIME' : 'STANDBY'}
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  Instant real-time estimates positioned directly underneath your camera lens.
                </p>
              </div>

              {/* Voice Speech CTA Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={announceCurrentExpression}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 hover:opacity-95 shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all cursor-pointer active:scale-95"
                >
                  <Volume2 className="w-4 h-4 text-slate-950" />
                  <span>Tell Me My Expression Aloud 🗣️</span>
                </button>

                <button
                  onClick={() => setAutoVoiceNarration(!autoVoiceNarration)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                    autoVoiceNarration
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'bg-slate-800 text-slate-400 border-white/10 hover:border-slate-700'
                  }`}
                  title="Speaks aloud whenever expression changes"
                >
                  <Radio className={`w-3.5 h-3.5 ${autoVoiceNarration ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
                  <span>Auto-Voice: {autoVoiceNarration ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Spoken Narration Subtitle Banner */}
            {lastSpokenMessage && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-900/90 border border-teal-500/40 text-xs text-teal-200 flex items-center gap-3 shadow-md animate-in fade-in">
                <div className="w-7 h-7 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-teal-300 animate-bounce" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
                    AI Voice Narration:
                  </span>
                  <span className="text-white font-medium text-xs">&quot;{lastSpokenMessage}&quot;</span>
                </div>
              </div>
            )}

            {/* Multi-Face Active Switcher Tabs (when 2+ faces are detected or alternating faces present) */}
            {detectedPersons.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 relative z-10">
                <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>ACTIVE FACES IN VIEW ({detectedPersons.length}):</span>
                </span>
                {detectedPersons.map((p, idx) => {
                  const isSelected = selectedFaceIdx === idx || (selectedFaceIdx >= detectedPersons.length && idx === 0);
                  return (
                    <button
                      key={p.personId}
                      onClick={() => setSelectedFaceIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-teal-500/25 text-teal-200 border-teal-500/70 shadow-[0_0_15px_rgba(20,184,166,0.3)] ring-1 ring-teal-400/30'
                          : 'bg-slate-800/80 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <span className="font-bold">Person {p.personId}</span>
                      <span>{p.expressionEmoji}</span>
                      <span className="text-[10px] font-mono opacity-80">({p.expression} • {p.ageRange})</span>
                      {p.isAlternateOrNew && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[9px] font-mono font-bold">
                          NEW/ALT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3 Giant Live Cards (Expression, Sex Category, Age Range) */}
            {displayPerson ? (
              <div className="space-y-5 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 🎭 CARD 1: DETECTED FACIAL EXPRESSION & FULL OTHER EXPRESSIONS SPECTRUM */}
                  <div
                    className="p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                    style={{
                      borderColor: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                      background: `linear-gradient(145deg, rgba(15, 23, 42, 0.95), ${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}15)`,
                      boxShadow: `0 0 25px ${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}25`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                          <span>🎭</span> Primary Expression
                        </span>
                        <div className="flex items-center gap-1.5">
                          {displayPerson.isAlternateOrNew && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                              ALT FACE
                            </span>
                          )}
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981'}25`,
                              color: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                            }}
                          >
                            {displayPerson.expressionConfidence}% Confidence
                          </span>
                        </div>
                      </div>

                      <div className="my-3 flex items-center gap-4">
                        <span className="text-5xl select-none animate-bounce" role="img" aria-label={displayPerson.expression}>
                          {displayPerson.expressionEmoji}
                        </span>
                        <div>
                          <div
                            className="text-2xl sm:text-3xl font-black tracking-tight uppercase"
                            style={{ color: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981' }}
                          >
                            {displayPerson.expression}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Person #{displayPerson.personId} dominant muscle activation
                          </p>
                        </div>
                      </div>

                      {/* Primary certainty bar */}
                      <div className="space-y-1 pb-3">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>Primary Dominance</span>
                          <span className="font-bold text-white">{displayPerson.expressionConfidence}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${displayPerson.expressionConfidence}%`,
                              backgroundColor: EXPRESSION_COLORS[displayPerson.expression.toLowerCase()] || '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Complete "Other Expressions" Spectrum Panel */}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-teal-400" />
                          <span>Other Expressions Spectrum:</span>
                        </span>
                        <button
                          onClick={() => setShowAllOtherExpressions(!showAllOtherExpressions)}
                          className="text-[10px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{showAllOtherExpressions ? 'Compact' : 'All (6)'}</span>
                          {showAllOtherExpressions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {(displayPerson.otherExpressions && displayPerson.otherExpressions.length > 0
                          ? displayPerson.otherExpressions
                          : ALL_EXPRESSIONS
                              .filter((k) => k !== displayPerson.expression.toLowerCase())
                              .map((k) => ({
                                name: k.charAt(0).toUpperCase() + k.slice(1),
                                key: k,
                                percent: displayPerson.expressionsAll?.[k] || 0,
                                emoji: EXPRESSION_EMOJIS[k] || '😐',
                                color: EXPRESSION_COLORS[k] || '#94a3b8',
                              }))
                        )
                          .slice(0, showAllOtherExpressions ? 6 : 3)
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
                                    opacity: item.percent > 0 ? 0.9 : 0.25,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* 👤 CARD 2: AI-ESTIMATED SEX CATEGORY */}
                  <div className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-slate-900/95 shadow-[0_0_25px_rgba(99,102,241,0.15)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                          <span>👤</span> AI-Estimated Sex
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {displayPerson.sexConfidence}% Estimate
                        </span>
                      </div>

                      <div className="my-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-3xl shrink-0">
                          {displayPerson.sexCategory === 'Female' ? '👩' : '👨'}
                        </div>
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                            {displayPerson.sexCategory}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Person #{displayPerson.personId} visual category classification
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-white/10">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Model Probability</span>
                        <span className="font-bold text-indigo-300">{displayPerson.sexConfidence}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${displayPerson.sexConfidence}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 pt-1 italic">
                        *AI visual estimate only; does not determine gender identity.
                      </p>
                    </div>
                  </div>

                  {/* 🎂 CARD 3: ESTIMATED AGE RANGE */}
                  <div className="p-5 rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-slate-900/95 via-teal-950/20 to-slate-900/95 shadow-[0_0_25px_rgba(20,184,166,0.15)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                          <span>🎂</span> Estimated Age Range
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          Regression Group
                        </span>
                      </div>

                      <div className="my-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-mono font-black text-xl text-teal-300 shrink-0">
                          {displayPerson.rawAge || '23'}
                        </div>
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-teal-300 tracking-tight font-mono">
                            {displayPerson.ageRange} <span className="text-sm font-sans font-normal text-slate-400">yrs</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Approx. point estimate: {displayPerson.rawAge || '23'} years
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-white/10">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Demographic Cohort</span>
                        <span className="font-bold text-teal-300">{displayPerson.ageRange}</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 pt-1">
                        {['0-12', '13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map((range) => (
                          <div
                            key={range}
                            title={range}
                            className={`h-2 rounded-sm transition-all ${
                              (displayPerson.ageRange || '').replace('–', '-') === range
                                ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 pt-1 italic">
                        *Facial biometric regression approximation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🌟 Alternating Faces in this Session Reel */}
                {sessionFacesLogged.length > 0 && (
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-teal-400" />
                        <span>Alternating Faces In This Session ({sessionFacesLogged.length} Unique Profiles Logged):</span>
                      </h4>
                      <span className="text-[10px] font-mono text-teal-400">
                        Live Tracking History
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {sessionFacesLogged.map((face, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 hover:border-teal-500/50 transition-all flex flex-col items-center text-center space-y-2 shadow-md relative overflow-hidden"
                        >
                          {face.image_thumbnail ? (
                            <img
                              src={face.image_thumbnail}
                              alt={face.person_label}
                              className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                              {face.expression_emoji || '👤'}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                              <span>{face.person_label}</span>
                              <span>{face.expression_emoji}</span>
                            </div>
                            <div className="text-[11px] text-teal-300 font-mono">{face.age_range}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{face.expression}</div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{face.detected_at}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Standby Prompt when Camera is ON (waiting for face) or OFF */
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
                  <Camera className="w-7 h-7" />
                </div>
                {cameraActive ? (
                  <div>
                    <h4 className="text-base font-bold text-white">Camera Active — Looking for Face in View</h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                      Webcam is running. Show your face to the camera (or bring alternating faces into view) to automatically see face expressions, age range, and all emotion percentages right here!
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-base font-bold text-white">Camera is currently Off</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Turn on your camera to immediately view your facial expression, AI-estimated sex, and estimated age range right here beneath the camera.
                    </p>
                    <button
                      onClick={() => startCamera(false)}
                      className="mt-3 px-6 py-2.5 rounded-xl font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)] text-xs inline-flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Power className="w-4 h-4" />
                      <span>Turn Camera On Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Ethical AI Banner */}
          <DisclaimerBadge />
        </div>

        {/* Right Col: Detected Faces List & Telemetry Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Currently in View</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                {detectedPersons.length}
              </span>
            </h3>

            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-teal-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All History</span>
              <span className="text-[10px] font-mono bg-teal-950 px-1.5 py-0.2 rounded border border-teal-500/30">
                {sessionFacesLogged.length} saved
              </span>
            </button>
          </div>

          {/* Scrollable container of detected person cards */}
          <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
            {detectedPersons.length > 0 ? (
              detectedPersons.map((person) => (
                <FaceCard key={person.personId} person={person} />
              ))
            ) : (
              <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center space-y-3 text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-xs">
                  {cameraActive
                    ? autoTurnOnFace
                      ? 'Monitoring stream... Show your face to the camera and analysis will turn on automatically!'
                      : 'No face detected in view.'
                    : 'Turn the camera ON or toggle Demo Mode to start detecting.'}
                </p>
                {!cameraActive && !isDemoMode && (
                  <button
                    onClick={() => startCamera(true)}
                    className="text-xs text-teal-300 hover:underline font-semibold block mx-auto pt-1"
                  >
                    Click to Turn On Camera
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Voice Command Cheat Sheet */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>Voice Commands Supported</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-400">
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Start camera&quot;</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Stop camera&quot;</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Start analysis&quot;</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Stop analysis&quot;</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Enable demo mode&quot;</span>
              <span className="bg-slate-900/80 px-2 py-1 rounded border border-white/5">&quot;Open history&quot;</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
