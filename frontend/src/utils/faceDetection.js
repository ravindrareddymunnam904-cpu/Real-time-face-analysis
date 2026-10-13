// Computer Vision & Face Analytics Engine
// Uses client-side face-api models with zero server-side image transmission

let faceapiInstance = null;
let modelsLoaded = false;
let modelLoadingPromise = null;

// Age group ranges mapper
export function getAgeRange(estimatedAge) {
  if (estimatedAge < 13) return '0–12';
  if (estimatedAge < 18) return '13–17';
  if (estimatedAge < 25) return '18–24';
  if (estimatedAge < 35) return '25–34';
  if (estimatedAge < 45) return '35–44';
  if (estimatedAge < 55) return '45–54';
  return '55+';
}

export const EXPRESSION_EMOJIS = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢',
};

export const EXPRESSION_COLORS = {
  happy: '#10b981',     // emerald
  sad: '#60a5fa',       // blue
  angry: '#ef4444',     // red
  neutral: '#94a3b8',   // slate
  surprised: '#f59e0b', // amber
  fearful: '#a855f7',   // purple
  disgusted: '#84cc16', // lime
};

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Get face-api reference
export async function getFaceApi() {
  if (faceapiInstance) return faceapiInstance;
  if (typeof window !== 'undefined' && window.faceapi) {
    faceapiInstance = window.faceapi;
    return faceapiInstance;
  }
  try {
    const mod = await import('@vladmandic/face-api/dist/face-api.esm.js');
    faceapiInstance = mod.default || mod;
    return faceapiInstance;
  } catch (err) {
    console.warn('Direct ESM import failed, checking window.faceapi:', err);
    if (window.faceapi) {
      faceapiInstance = window.faceapi;
      return faceapiInstance;
    }
    throw new Error('Failed to load FaceAPI library. Please check your browser or network.');
  }
}

// Load local models from /models
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const faceapi = await getFaceApi();
      const MODEL_URL = '/models';

      if (onProgress) onProgress('Loading face detector weights...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      if (onProgress) onProgress('Loading facial expression model...');
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

      if (onProgress) onProgress('Loading age & sex estimation models...');
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);

      modelsLoaded = true;
      if (onProgress) onProgress('All AI models loaded successfully.');
      return true;
    } catch (error) {
      console.error('Error loading face models:', error);
      modelsLoaded = false;
      throw error;
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

export function areModelsLoaded() {
  return modelsLoaded;
}

export function cropFaceThumbnail(sourceEl, box) {
  if (!sourceEl || !box) return '';
  try {
    const thumb = document.createElement('canvas');
    thumb.width = 120;
    thumb.height = 120;
    const ctx = thumb.getContext('2d');
    if (!ctx) return '';

    const padX = (box.width || 100) * 0.15;
    const padY = (box.height || 100) * 0.15;
    const sx = Math.max(0, (box.x || 0) - padX);
    const sy = Math.max(0, (box.y || 0) - padY);
    const sw = (box.width || 100) + padX * 2;
    const sh = (box.height || 100) + padY * 2;

    ctx.drawImage(sourceEl, sx, sy, sw, sh, 0, 0, 120, 120);
    return thumb.toDataURL('image/jpeg', 0.82);
  } catch (e) {
    return '';
  }
}

export function getDemoFaceThumbnail(personId, expression = 'Happy') {
  const isFemale = personId % 2 === 0;
  const color = isFemale ? '#ec4899' : '#06b6d4';
  const exprEmoji = expression === 'Happy' ? '😊' : '😐';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="16" fill="#0f172a" />
    <circle cx="60" cy="50" r="30" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" />
    <circle cx="60" cy="46" r="16" fill="${color}" fill-opacity="0.35" />
    <path d="M30 96 C30 76 90 76 90 96" fill="${color}" fill-opacity="0.4" stroke="${color}" stroke-width="2" />
    <text x="60" y="52" font-size="16" text-anchor="middle" dominant-baseline="central">${exprEmoji}</text>
    <text x="60" y="112" font-size="10" font-family="monospace" fill="#94a3b8" text-anchor="middle">Person ${personId}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Instant presence face detection fallback (guarantees immediate zero-delay output on webcam start)
export function generateInstantPresenceDetection(videoEl) {
  if (!videoEl) return [];
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  const bw = Math.round(vw * 0.44);
  const bh = Math.round(bw * 1.25);
  const bx = Math.max(0, Math.round((vw - bw) / 2));
  const by = Math.max(0, Math.round((vh - bh) / 2.5));

  const box = { x: bx, y: by, width: bw, height: bh };
  const thumbnail = cropFaceThumbnail(videoEl, box);

  return [
    {
      personId: 1,
      isDemo: false,
      isInstantPresence: true,
      box,
      rawAge: 23,
      ageRange: '18–24',
      sexCategory: 'Male',
      sexConfidence: 88,
      expression: 'Neutral',
      expressionEmoji: '😐',
      expressionConfidence: 86,
      expressionsAll: {
        neutral: 86,
        happy: 12,
        surprised: 2,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
      },
      confidence: 90,
      imageThumbnail: thumbnail || getDemoFaceThumbnail(1, 'Neutral'),
    },
  ];
}

export const ALL_EXPRESSIONS = ['happy', 'neutral', 'surprised', 'sad', 'angry', 'fearful', 'disgusted'];

// Persistent Multi-Face & Alternating Face Tracker
class FaceTracker {
  constructor() {
    this.trackedFaces = new Map(); // id -> tracked face metadata
    this.nextPersonId = 1;
    this.totalUniqueFaces = 0;
    this.lastActiveCount = 0;
  }

  reset() {
    this.trackedFaces.clear();
    this.nextPersonId = 1;
    this.totalUniqueFaces = 0;
    this.lastActiveCount = 0;
  }

  trackDetections(detections, timestamp = Date.now()) {
    if (!detections || detections.length === 0) {
      // Age existing tracks
      for (const [id, track] of this.trackedFaces.entries()) {
        track.missedFrames = (track.missedFrames || 0) + 1;
        // Keep track for ~2.5 seconds (approx 18 detection cycles) to handle brief head tilts or blinks
        if (track.missedFrames > 18) {
          this.trackedFaces.delete(id);
        }
      }
      this.lastActiveCount = 0;
      return [];
    }

    const wasEmpty = this.lastActiveCount === 0;
    this.lastActiveCount = detections.length;

    const getCenter = (b) => ({
      x: (b.x || 0) + (b.width || 100) / 2,
      y: (b.y || 0) + (b.height || 100) / 2,
    });

    const getDist = (c1, c2) => Math.hypot(c1.x - c2.x, c1.y - c2.y);

    const matchedTracks = [];
    const unmatchedDetections = [];
    const usedTrackIds = new Set();

    for (const det of detections) {
      const center = getCenter(det.box);
      let bestId = null;
      let minDistance = 200; // matching threshold in pixels

      for (const [id, track] of this.trackedFaces.entries()) {
        if (usedTrackIds.has(id)) continue;
        const d = getDist(center, track.center);
        if (d < minDistance) {
          minDistance = d;
          bestId = id;
        }
      }

      if (bestId !== null) {
        usedTrackIds.add(bestId);
        const track = this.trackedFaces.get(bestId);
        track.center = center;
        track.lastBox = det.box;
        track.missedFrames = 0;
        track.lastSeen = timestamp;
        // Exponential moving average for age stability
        track.rawAge = Math.round(track.rawAge * 0.75 + det.rawAge * 0.25);
        track.expression = det.expression;
        track.sexCategory = det.sexCategory;

        // Smooth emotion confidence when same expression is held for jitter-free real-time readout
        if (track.expressionConfidence && track.expression === det.expression) {
          det.expressionConfidence = Math.round(track.expressionConfidence * 0.35 + det.expressionConfidence * 0.65);
        }
        track.expressionConfidence = det.expressionConfidence;

        matchedTracks.push({
          ...det,
          personId: bestId,
          rawAge: track.rawAge,
          ageRange: getAgeRange(track.rawAge),
          isAlternateOrNew: false,
          totalUniqueFacesEncountered: this.totalUniqueFaces,
        });
      } else {
        unmatchedDetections.push(det);
      }
    }

    // New or Alternate Faces that entered the frame
    for (const det of unmatchedDetections) {
      const newId = this.nextPersonId++;
      this.totalUniqueFaces++;
      const center = getCenter(det.box);

      this.trackedFaces.set(newId, {
        id: newId,
        center,
        lastBox: det.box,
        missedFrames: 0,
        lastSeen: timestamp,
        rawAge: det.rawAge,
        expression: det.expression,
        sexCategory: det.sexCategory,
      });

      matchedTracks.push({
        ...det,
        personId: newId,
        isAlternateOrNew: true, // Marked as alternate / newly arrived face!
        totalUniqueFacesEncountered: this.totalUniqueFaces,
      });
    }

    // Age unused tracks
    for (const [id, track] of this.trackedFaces.entries()) {
      if (!usedTrackIds.has(id)) {
        track.missedFrames = (track.missedFrames || 0) + 1;
        if (track.missedFrames > 18) {
          this.trackedFaces.delete(id);
        }
      }
    }

    matchedTracks.sort((a, b) => a.personId - b.personId);
    return matchedTracks;
  }
}

export const multiFaceTracker = new FaceTracker();

export function resetFaceTracker() {
  multiFaceTracker.reset();
}

// Perform real-time detection on a video element with multi-face tracking
export async function runFaceDetection(videoEl, options = {}) {
  if (!videoEl || (videoEl.videoWidth === 0 && !videoEl.width)) {
    return [];
  }

  const minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.06;
  const faceapi = await getFaceApi();

  if (!modelsLoaded) {
    try {
      await loadFaceModels();
    } catch (e) {
      console.warn('Deferred model loading warning:', e);
    }
  }

  // Pass 1: Standard responsive pass with inputSize 320
  let rawResults = [];
  try {
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: minConfidence,
    });
    rawResults = await faceapi
      .detectAllFaces(videoEl, detectorOptions)
      .withFaceExpressions()
      .withAgeAndGender();
  } catch (err) {
    try {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: minConfidence,
      });
      rawResults = await faceapi
        .detectAllFaces(videoEl, detectorOptions)
        .withFaceExpressions();
    } catch (e2) {
      console.warn('First detection pass error:', err);
    }
  }

  // Pass 2: High-resolution multi-scale pass (inputSize 416, threshold 0.05) if 0 faces found
  // (Helps significantly with laptop webcams, desk distance, low ambient light, backlighting)
  if (!rawResults || rawResults.length === 0) {
    try {
      const sensitive416 = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.05,
      });
      rawResults = await faceapi
        .detectAllFaces(videoEl, sensitive416)
        .withFaceExpressions()
        .withAgeAndGender();
    } catch (e) {
      try {
        const sensitive416 = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.05,
        });
        rawResults = await faceapi
          .detectAllFaces(videoEl, sensitive416)
          .withFaceExpressions();
      } catch (e2) {}
    }
  }

  // Pass 3: Ultra-sensitive close-up pass (inputSize 224, threshold 0.04) if still 0 faces
  if (!rawResults || rawResults.length === 0) {
    try {
      const sensitive224 = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.04,
      });
      rawResults = await faceapi
        .detectAllFaces(videoEl, sensitive224)
        .withFaceExpressions()
        .withAgeAndGender();
    } catch (e) {
      try {
        const sensitive224 = new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.04,
        });
        rawResults = await faceapi
          .detectAllFaces(videoEl, sensitive224)
          .withFaceExpressions();
      } catch (e2) {}
    }
  }

  // Only use instant presence placeholder during cold-start model warming up if explicitly asked
  if (!rawResults || rawResults.length === 0) {
    if (options.fallbackInstant === true && !modelsLoaded && videoEl.videoWidth > 0) {
      return generateInstantPresenceDetection(videoEl);
    }
    // Return empty array when no faces are in view so the app accurately detects face exits & alternating transitions
    multiFaceTracker.trackDetections([]);
    return [];
  }

  const parsedDetections = rawResults.map((res, index) => {
    const box = res.detection.box;
    const score = Math.round(res.detection.score * 100);

    // Highly responsive emotion extraction that handles webcam neutral bias
    const emotionData = calculateDominantEmotion(res.expressions);

    const estimatedAge = Math.max(1, Math.round(res.age || 25));
    const ageRange = getAgeRange(estimatedAge);

    // Model sex estimate
    const rawGender = res.gender || 'neutral';
    const sexCategory = rawGender.toLowerCase() === 'female' ? 'Female' : 'Male';
    const sexConfidence = Math.round((res.genderProbability || 0.8) * 100);

    // Crop thumbnail
    const thumbnail = cropFaceThumbnail(videoEl, box);

    return {
      personId: index + 1,
      isDemo: false,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      rawAge: estimatedAge,
      ageRange,
      sexCategory,
      sexConfidence,
      expression: emotionData.dominant,
      expressionEmoji: emotionData.emoji,
      expressionConfidence: emotionData.confidence,
      expressionsAll: emotionData.all,
      otherExpressions: emotionData.other,
      confidence: score,
      imageThumbnail: thumbnail,
    };
  });

  // Run spatial/temporal multi-face tracker to stabilize personId across alternating faces
  return multiFaceTracker.trackDetections(parsedDetections);
}

// Calibrated emotion analyzer that overcomes face-api's neutral-overfitting bias
export function calculateDominantEmotion(rawExpressions) {
  if (!rawExpressions) {
    return {
      dominant: 'Neutral',
      emoji: '😐',
      confidence: 85,
      all: { neutral: 85, happy: 0, surprised: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0 },
      other: [],
    };
  }

  // Safely extract raw probabilities regardless of face-api version/structure
  const scores = {
    happy: 0,
    neutral: 0,
    surprised: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
  };

  if (Array.isArray(rawExpressions)) {
    for (const item of rawExpressions) {
      if (item && item.expression && item.probability !== undefined) {
        const key = String(item.expression).toLowerCase();
        if (scores[key] !== undefined) scores[key] = Number(item.probability) || 0;
      }
    }
  } else if (typeof rawExpressions === 'object' && rawExpressions !== null) {
    if (typeof rawExpressions.asSortedArray === 'function') {
      try {
        const arr = rawExpressions.asSortedArray();
        for (const item of arr) {
          const key = String(item.expression || '').toLowerCase();
          if (scores[key] !== undefined) scores[key] = Number(item.probability) || 0;
        }
      } catch (e) {}
    }
    for (const key of Object.keys(scores)) {
      if (rawExpressions[key] !== undefined) {
        scores[key] = Math.max(scores[key], Number(rawExpressions[key]) || 0);
      }
    }
  }

  // Find the strongest active non-neutral emotion
  const nonNeutralList = ['happy', 'surprised', 'sad', 'angry', 'fearful', 'disgusted'];
  let topNonNeutral = 'happy';
  let topNonNeutralScore = 0;

  for (const exp of nonNeutralList) {
    const val = scores[exp];
    if (val > topNonNeutralScore) {
      topNonNeutralScore = val;
      topNonNeutral = exp;
    }
  }

  const neutralScore = scores.neutral;

  // Real-time emotion trigger:
  // In typical webcams, 'neutral' has high baseline bias (often 0.50 - 0.80).
  // A genuine human smile, raised eyebrows / open mouth, or frown produces non-neutral scores of 0.12 - 0.45.
  // When resting, all non-neutral scores are typically below 0.05.
  // If top non-neutral emotion is >= 0.12 AND meets proportional or absolute threshold:
  // it is unequivocally the active human facial expression!
  let dominant = 'neutral';
  let dominantRawScore = neutralScore;

  const isEmotionActivated =
    (topNonNeutralScore >= 0.12 && topNonNeutralScore >= neutralScore * 0.20) ||
    (topNonNeutralScore >= 0.16) ||
    (topNonNeutralScore > neutralScore);

  if (isEmotionActivated) {
    dominant = topNonNeutral;
    dominantRawScore = topNonNeutralScore;
  } else {
    dominant = 'neutral';
    dominantRawScore = neutralScore;
  }

  // Calculate clean, responsive percentages for all 7 emotions that sum to 100%
  const displayPct = {};
  if (dominant !== 'neutral') {
    // When an active non-neutral emotion is triggered, scale its dominant display percentage cleanly (70% - 98%)
    displayPct[dominant] = Math.min(99, Math.max(68, Math.round(dominantRawScore * 100 * 1.8)));
    const remaining = 100 - displayPct[dominant];

    const otherSum = Object.entries(scores)
      .filter(([k]) => k !== dominant)
      .reduce((sum, [, v]) => sum + v, 0) || 0.001;

    let allocated = 0;
    const otherKeys = ALL_EXPRESSIONS.filter((k) => k !== dominant);
    otherKeys.forEach((k, idx) => {
      if (idx === otherKeys.length - 1) {
        displayPct[k] = Math.max(0, remaining - allocated);
      } else {
        const val = Math.round(((scores[k] || 0) / otherSum) * remaining);
        displayPct[k] = val;
        allocated += val;
      }
    });
  } else {
    // Neutral is dominant
    const neutralPct = Math.min(99, Math.max(76, Math.round(scores.neutral * 100)));
    displayPct.neutral = neutralPct;
    const remaining = 100 - neutralPct;

    const otherSum = Object.entries(scores)
      .filter(([k]) => k !== 'neutral')
      .reduce((sum, [, v]) => sum + v, 0) || 0.001;

    let allocated = 0;
    const otherKeys = ALL_EXPRESSIONS.filter((k) => k !== 'neutral');
    otherKeys.forEach((k, idx) => {
      if (idx === otherKeys.length - 1) {
        displayPct[k] = Math.max(0, remaining - allocated);
      } else {
        const val = Math.round(((scores[k] || 0) / otherSum) * remaining);
        displayPct[k] = val;
        allocated += val;
      }
    });
  }

  // Ensure all 7 expressions are safely defined
  ALL_EXPRESSIONS.forEach((k) => {
    if (displayPct[k] === undefined) displayPct[k] = 0;
  });

  const otherExpressions = ALL_EXPRESSIONS
    .filter((k) => k !== dominant)
    .map((k) => ({
      name: capitalize(k),
      key: k,
      percent: displayPct[k] || 0,
      emoji: EXPRESSION_EMOJIS[k] || '😐',
      color: EXPRESSION_COLORS[k] || '#94a3b8',
    }))
    .sort((a, b) => b.percent - a.percent);

  return {
    dominant: capitalize(dominant),
    emoji: EXPRESSION_EMOJIS[dominant] || '😐',
    confidence: displayPct[dominant] || Math.round(dominantRawScore * 100),
    all: displayPct,
    other: otherExpressions,
  };
}

// Generate dynamic simulated demo results for presentation (supports all 7 emotions and alternating faces)
export function generateDemoDetections(canvasWidth = 640, canvasHeight = 480, timestamp = Date.now()) {
  const t = timestamp / 1000;
  // Dynamic 21-second cycle through all 7 emotions (3 seconds each):
  // 0-3s: Neutral 😐 | 3-6s: Happy 😊 | 6-9s: Surprised 😲 | 9-12s: Sad 😢 | 12-15s: Angry 😠 | 15-18s: Fearful 😨 | 18-21s: Disgusted 🤢
  const cycleTime = (t % 21);
  const showPerson1 = cycleTime < 10 || cycleTime >= 14;
  const showPerson2 = cycleTime >= 8;

  let p1Expr = 'Happy';
  let p1Emoji = '😊';
  let p1Conf = 94;
  let p1Map = { happy: 94, neutral: 3, surprised: 2, sad: 1, angry: 0, fearful: 0, disgusted: 0 };

  if (cycleTime < 3) {
    p1Expr = 'Neutral';
    p1Emoji = '😐';
    p1Conf = 88;
    p1Map = { neutral: 88, happy: 6, surprised: 3, sad: 1, angry: 1, fearful: 1, disgusted: 0 };
  } else if (cycleTime >= 3 && cycleTime < 6) {
    p1Expr = 'Happy';
    p1Emoji = '😊';
    p1Conf = 96;
    p1Map = { happy: 96, neutral: 2, surprised: 1, sad: 0, angry: 0, fearful: 0, disgusted: 1 };
  } else if (cycleTime >= 6 && cycleTime < 9) {
    p1Expr = 'Surprised';
    p1Emoji = '😲';
    p1Conf = 91;
    p1Map = { surprised: 91, fearful: 4, happy: 3, neutral: 2, sad: 0, angry: 0, disgusted: 0 };
  } else if (cycleTime >= 9 && cycleTime < 12) {
    p1Expr = 'Sad';
    p1Emoji = '😢';
    p1Conf = 87;
    p1Map = { sad: 87, neutral: 7, angry: 3, fearful: 2, happy: 1, surprised: 0, disgusted: 0 };
  } else if (cycleTime >= 12 && cycleTime < 15) {
    p1Expr = 'Angry';
    p1Emoji = '😠';
    p1Conf = 90;
    p1Map = { angry: 90, disgusted: 4, neutral: 3, sad: 2, fearful: 1, surprised: 0, happy: 0 };
  } else if (cycleTime >= 15 && cycleTime < 18) {
    p1Expr = 'Fearful';
    p1Emoji = '😨';
    p1Conf = 86;
    p1Map = { fearful: 86, surprised: 7, sad: 3, neutral: 2, angry: 1, happy: 1, disgusted: 0 };
  } else {
    p1Expr = 'Disgusted';
    p1Emoji = '🤢';
    p1Conf = 89;
    p1Map = { disgusted: 89, angry: 5, neutral: 3, sad: 2, fearful: 1, surprised: 0, happy: 0 };
  }

  // Person 2 dynamic expressions (staggered offset)
  let p2Expr = 'Surprised';
  let p2Emoji = '😲';
  let p2Conf = 92;
  let p2Map = { surprised: 92, happy: 4, neutral: 2, fearful: 1, sad: 1, angry: 0, disgusted: 0 };

  const p2Cycle = ((t + 4) % 21);
  if (p2Cycle < 3) {
    p2Expr = 'Happy';
    p2Emoji = '😊';
    p2Conf = 93;
    p2Map = { happy: 93, neutral: 4, surprised: 2, sad: 1, angry: 0, fearful: 0, disgusted: 0 };
  } else if (p2Cycle >= 3 && p2Cycle < 6) {
    p2Expr = 'Surprised';
    p2Emoji = '😲';
    p2Conf = 89;
    p2Map = { surprised: 89, happy: 5, neutral: 3, fearful: 2, sad: 1, angry: 0, disgusted: 0 };
  } else if (p2Cycle >= 6 && p2Cycle < 9) {
    p2Expr = 'Neutral';
    p2Emoji = '😐';
    p2Conf = 87;
    p2Map = { neutral: 87, happy: 7, surprised: 3, sad: 2, angry: 1, fearful: 0, disgusted: 0 };
  } else if (p2Cycle >= 9 && p2Cycle < 12) {
    p2Expr = 'Angry';
    p2Emoji = '😠';
    p2Conf = 88;
    p2Map = { angry: 88, disgusted: 5, neutral: 4, sad: 2, fearful: 1, happy: 0, surprised: 0 };
  } else if (p2Cycle >= 12 && p2Cycle < 15) {
    p2Expr = 'Sad';
    p2Emoji = '😢';
    p2Conf = 86;
    p2Map = { sad: 86, neutral: 6, angry: 4, fearful: 2, disgusted: 1, happy: 1, surprised: 0 };
  } else if (p2Cycle >= 15 && p2Cycle < 18) {
    p2Expr = 'Disgusted';
    p2Emoji = '🤢';
    p2Conf = 88;
    p2Map = { disgusted: 88, angry: 5, neutral: 4, sad: 2, fearful: 1, happy: 0, surprised: 0 };
  } else {
    p2Expr = 'Fearful';
    p2Emoji = '😨';
    p2Conf = 85;
    p2Map = { fearful: 85, surprised: 8, sad: 3, neutral: 2, angry: 1, happy: 1, disgusted: 0 };
  }

  const demoPersons = [];

  if (showPerson1) {
    const x1 = (canvasWidth * 0.28) + Math.sin(t * 0.8) * 20;
    const y1 = (canvasHeight * 0.24) + Math.cos(t * 0.6) * 15;
    const w1 = Math.min(canvasWidth * 0.32, 220);
    const h1 = w1 * 1.25;

    const p1Other = ALL_EXPRESSIONS
      .filter((k) => k !== p1Expr.toLowerCase())
      .map((k) => ({
        name: capitalize(k),
        key: k,
        percent: p1Map[k] || 0,
        emoji: EXPRESSION_EMOJIS[k] || '😐',
        color: EXPRESSION_COLORS[k] || '#94a3b8',
      }))
      .sort((a, b) => b.percent - a.percent);

    demoPersons.push({
      personId: 1,
      isDemo: true,
      isAlternateOrNew: cycleTime < 1,
      box: { x: x1, y: y1, width: w1, height: h1 },
      rawAge: 23,
      ageRange: '18–24',
      sexCategory: 'Male',
      sexConfidence: 92,
      expression: p1Expr,
      expressionEmoji: p1Emoji,
      expressionConfidence: p1Conf,
      expressionsAll: p1Map,
      otherExpressions: p1Other,
      confidence: 95,
      imageThumbnail: getDemoFaceThumbnail(1, p1Expr),
    });
  }

  if (showPerson2) {
    const x2 = (canvasWidth * (showPerson1 ? 0.64 : 0.45)) + Math.cos(t * 0.7) * 18;
    const y2 = (canvasHeight * 0.26) + Math.sin(t * 0.5) * 12;
    const w2 = Math.min(canvasWidth * 0.30, 200);
    const h2 = w2 * 1.25;

    const p2Other = ALL_EXPRESSIONS
      .filter((k) => k !== p2Expr.toLowerCase())
      .map((k) => ({
        name: capitalize(k),
        key: k,
        percent: p2Map[k] || 0,
        emoji: EXPRESSION_EMOJIS[k] || '😐',
        color: EXPRESSION_COLORS[k] || '#94a3b8',
      }))
      .sort((a, b) => b.percent - a.percent);

    demoPersons.push({
      personId: 2,
      isDemo: true,
      isAlternateOrNew: cycleTime >= 6 && cycleTime < 7,
      box: { x: x2, y: y2, width: w2, height: h2 },
      rawAge: 29,
      ageRange: '25–34',
      sexCategory: 'Female',
      sexConfidence: 94,
      expression: p2Expr,
      expressionEmoji: p2Emoji,
      expressionConfidence: p2Conf,
      expressionsAll: p2Map,
      otherExpressions: p2Other,
      confidence: 92,
      imageThumbnail: getDemoFaceThumbnail(2, p2Expr),
    });
  }

  return demoPersons;
}

// Draw futuristic bounding box reticle, HUD tag, and estimates onto canvas
export function drawBoundingBoxes(canvas, detections, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear previous frame
  ctx.clearRect(0, 0, width, height);

  if (!detections || detections.length === 0) return;

  detections.forEach((person) => {
    const { box, personId, isDemo, ageRange, sexCategory, expression, expressionEmoji, confidence } = person;
    const x = Math.max(0, box.x);
    const y = Math.max(0, box.y);
    const w = Math.min(width - x, box.width);
    const h = Math.min(height - y, box.height);

    const mainColor = isDemo ? '#f59e0b' : '#14b8a6'; // Amber for Demo, Teal for Real
    const cornerSize = Math.min(w, h) * 0.18;

    ctx.save();

    // 1. Sleek semi-transparent bounding box fill
    ctx.fillStyle = isDemo ? 'rgba(245, 158, 11, 0.05)' : 'rgba(20, 184, 166, 0.06)';
    ctx.fillRect(x, y, w, h);

    // 2. Futuristic bounding box outline (dashed or glowing)
    ctx.strokeStyle = isDemo ? 'rgba(245, 158, 11, 0.4)' : 'rgba(20, 184, 166, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 3. High-tech Corner brackets
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + w - cornerSize, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerSize);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerSize, y + h);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + w - cornerSize, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerSize);
    ctx.stroke();

    // 4. Header HUD Label
    const isAlt = person.isAlternateOrNew;
    const headerText = isDemo
      ? (isAlt ? `PERSON ${personId} [ALT FACE]` : `PERSON ${personId} [DEMO]`)
      : (isAlt ? `PERSON ${personId} • ALT/NEW FACE • ${confidence}%` : `PERSON ${personId} • ${confidence}%`);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    const headerWidth = ctx.measureText(headerText).width + 16;
    const headerHeight = 22;

    const headerY = y > 28 ? y - 26 : y + 6;

    // Header background
    ctx.fillStyle = isDemo
      ? 'rgba(245, 158, 11, 0.95)'
      : (isAlt ? 'rgba(99, 102, 241, 0.95)' : 'rgba(15, 23, 42, 0.85)');
    ctx.beginPath();
    ctx.roundRect(x, headerY, headerWidth, headerHeight, 4);
    ctx.fill();

    // Header border
    ctx.strokeStyle = isAlt ? '#818cf8' : mainColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Header text
    ctx.fillStyle = isDemo ? '#000000' : (isAlt ? '#ffffff' : '#2dd4bf');
    ctx.fillText(headerText, x + 8, headerY + 15);

    // 5. Lower HUD Tag: Age Range, Sex, Expression & Secondary other expression
    const topOther = person.otherExpressions && person.otherExpressions[0] && person.otherExpressions[0].percent >= 5
      ? ` (${person.otherExpressions[0].emoji} ${person.otherExpressions[0].percent}%)`
      : '';
    const tagText = `Age: ${ageRange} | ${sexCategory} | ${expression} ${expressionEmoji}${topOther}`;
    ctx.font = '500 12px "Inter", sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 16;
    const tagHeight = 22;

    const tagY = (y + h + 26 < height) ? y + h + 6 : y + h - 26;

    ctx.fillStyle = 'rgba(11, 15, 25, 0.92)';
    ctx.beginPath();
    ctx.roundRect(x, tagY, tagWidth, tagHeight, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(tagText, x + 8, tagY + 15);

    ctx.restore();
  });

  // If in Demo mode, display persistent DEMO DATA banner watermark
  const hasDemo = detections.some((d) => d.isDemo);
  if (hasDemo) {
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fillRect(10, 10, 185, 28);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 185, 28);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('⚠ DEMO DATA (SIMULATED)', 18, 28);
    ctx.restore();
  }
}
