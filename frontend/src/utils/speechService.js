// Web Speech API Voice Recognition and Text-to-Speech service
// Purely for hands-free workflow commands. Strictly NEVER used for biometric identification.

export function playChime(freq = 587.33) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio context may require user gesture on first interaction
  }
}

export function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    playChime(659.25); // E5 chime
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira')));
      if (preferred) utterance.voice = preferred;
      else {
        const anyEn = voices.find((v) => v.lang.startsWith('en'));
        if (anyEn) utterance.voice = anyEn;
      }
    }

    // Cancel queued utterances and speak immediately
    window.speechSynthesis.cancel();
    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
      }
    }, 40);
  } catch (e) {
    console.warn('speakText error:', e);
  }
}

export class VoiceAssistant {
  constructor(options = {}) {
    this.onCommand = options.onCommand || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});
    this.ttsEnabled = options.ttsEnabled !== false;
    
    this.recognition = null;
    this.isListening = false;
    this.lastCommand = '';
    this.supported = false;

    this.initRecognition();
  }

  initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.supported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStatusChange({ isListening: true, statusText: 'Listening...' });
      };

      this.recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        this.processCommand(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          this.isListening = false;
          this.onError('Microphone permission denied. Click the mic button to grant access.');
          this.onStatusChange({ isListening: false, statusText: 'Mic blocked' });
        } else if (event.error !== 'no-speech') {
          this.onStatusChange({ isListening: this.isListening, statusText: `Error: ${event.error}` });
        }
      };

      this.recognition.onend = () => {
        // If continuous listening is desired and still flagged listening, restart
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            this.onStatusChange({ isListening: false, statusText: 'Idle' });
          }
        } else {
          this.onStatusChange({ isListening: false, statusText: 'Idle' });
        }
      };
    } else {
      this.supported = false;
    }
  }

  isSupported() {
    return this.supported;
  }

  start() {
    if (!this.supported) {
      this.onError('Web Speech API is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }
    try {
      this.isListening = true;
      this.recognition.start();
      this.speak('Voice control activated.');
    } catch (err) {
      console.warn('Speech recognition start error:', err);
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {}
    }
    this.onStatusChange({ isListening: false, statusText: 'Idle' });
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  setTtsEnabled(enabled) {
    this.ttsEnabled = enabled;
  }

  speak(text) {
    if (!this.ttsEnabled) return;
    speakText(text);
  }

  processCommand(rawTranscript) {
    const text = rawTranscript.toLowerCase();
    let recognizedAction = null;
    let spokenReply = '';

    // Command patterns matching requested specifications
    if (text.includes('start camera') || text.includes('turn on camera') || text.includes('open camera')) {
      recognizedAction = 'START_CAMERA';
      spokenReply = 'Camera started.';
    } else if (text.includes('stop camera') || text.includes('turn off camera') || text.includes('close camera')) {
      recognizedAction = 'STOP_CAMERA';
      spokenReply = 'Camera stopped.';
    } else if (text.includes('start analysis') || text.includes('resume analysis') || text.includes('begin analysis')) {
      recognizedAction = 'START_ANALYSIS';
      spokenReply = 'Real-time analysis resumed.';
    } else if (text.includes('stop analysis') || text.includes('pause analysis')) {
      recognizedAction = 'STOP_ANALYSIS';
      spokenReply = 'Analysis paused.';
    } else if (text.includes('open dashboard') || text.includes('go to dashboard') || text.includes('show dashboard')) {
      recognizedAction = 'NAVIGATE_DASHBOARD';
      spokenReply = 'Opening dashboard.';
    } else if (text.includes('show analytics') || text.includes('open analytics') || text.includes('go to analytics')) {
      recognizedAction = 'NAVIGATE_ANALYTICS';
      spokenReply = 'Opening analytics.';
    } else if (text.includes('open history') || text.includes('show history') || text.includes('go to history')) {
      recognizedAction = 'NAVIGATE_HISTORY';
      spokenReply = 'Opening history.';
    } else if (text.includes('enable demo') || text.includes('start demo') || text.includes('demo mode')) {
      recognizedAction = 'ENABLE_DEMO';
      spokenReply = 'Demo mode enabled.';
    } else if (text.includes('disable demo') || text.includes('exit demo') || text.includes('stop demo')) {
      recognizedAction = 'DISABLE_DEMO';
      spokenReply = 'Demo mode disabled.';
    } else if (text.includes('logout') || text.includes('log out') || text.includes('sign out')) {
      recognizedAction = 'LOGOUT';
      spokenReply = 'Logging out.';
    } else if (
      text.includes('voice login') ||
      text.includes('sign in') ||
      text.includes('log in') ||
      text.includes('demo login') ||
      text.includes('login')
    ) {
      recognizedAction = 'VOICE_LOGIN';
      spokenReply = 'Voice login initiated.';
    }

    if (recognizedAction) {
      this.lastCommand = rawTranscript;
      this.onCommand(recognizedAction, rawTranscript);
      if (spokenReply) {
        this.speak(spokenReply);
      }
    } else {
      this.lastCommand = rawTranscript;
      this.onCommand('UNKNOWN', rawTranscript);
    }
  }
}
