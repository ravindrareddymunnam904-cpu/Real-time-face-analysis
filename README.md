# AI Vision – Real-Time Face Analytics

A privacy-first, full-stack web application for real-time edge facial analytics powered by in-browser computer vision. The system analyzes webcam feeds directly on the client machine to generate instant estimates for approximate age ranges, facial expressions, and visual sex categories with full confidence telemetry.

---

## 🔒 Privacy-by-Design Architecture & Ethical AI

- **No Face Recognition**: The application strictly detects face presence and bounding coordinates. It **never** performs face recognition or personal identification.
- **Client-Side Edge Inference**: All neural network processing runs locally inside the browser. Raw video frames and camera feeds **never** leave your machine.
- **Zero Video / Image Storage**: Neither the frontend nor the backend ever captures, uploads, or stores camera images, videos, or raw frames.
- **Zero Biometric Embeddings**: No facial landmark embeddings, vectors, or biometric templates are stored.
- **Approximations & Disclaimers**:
  - **Estimated Age Range**: Grouped into broad cohorts (e.g. `18–24`, `25–34`) rather than claiming exact age.
  - **AI-Estimated Sex Category**: Clearly labeled as a visual surface heuristic; does not determine gender identity.
  - **Detected Facial Expression**: Evaluates surface pattern configurations (Happy, Sad, Angry, Neutral, Surprised, Fearful, Disgusted), not authentic internal emotional feelings.
- **Voice Privacy**: Speech commands use the browser's Web Speech API purely for UI control. Audio is never recorded or stored.

---

## 🚀 Key Features

1. **Real-Time Webcam Analysis & Camera Power Controls**:
   - Master **Camera Power ON / OFF** switch with instant hardware activation and standby power saving.
   - **Auto Turn-On on Face Presence**: When enabled, the camera automatically detects when a person's face appears and awakens live face analytics and recording with voice confirmation.
   - Multi-face detection with futuristic glowing bounding reticles and HUD tags.
   - Live stream controls: Start, Stop, Pause/Resume, Fullscreen.
   - Throttled inference loops (configurable 60ms–400ms) ensuring smooth 60 FPS rendering.
2. **Interactive Presentation Demo Mode**:
   - Instant simulated presentation mode for environments without a camera or permissions.
   - Dynamic animated reticles with clearly labeled `DEMO DATA (SIMULATED)` watermarks.
3. **Voice Control Assistant 🎙️**:
   - Hands-free operation via Web Speech API.
   - Real-time listening indicator and last recognized command badge.
   - Optional Text-to-Speech (TTS) auditory confirmations.
4. **All Persons Faces History Gallery (Option in History)**:
   - Dedicated visual gallery showing all individual detected persons' face profiles.
   - Displays cropped face portraits, person labels, age cohort estimates, sex categories, expression badges (Happy 😊, Neutral 😐, etc.), and confidence scores.
   - Filter by expression (Happy, Neutral, Surprised, Sad, Angry) or sex category.
   - Search face records and export to CSV.
5. **Interactive Dashboard**:
   - Aggregated metrics: Total faces logged, simultaneous peak faces, average estimated age, top expression.
   - Live visual charts with instant sample dataset seeding for evaluation.
6. **Statistical Analytics (Recharts)**:
   - Age-group distribution bar charts.
   - Detected expression breakdown charts.
   - AI-estimated sex-category pie distributions.
   - Multi-session face volume timeline charts.
   - Export analytics reports to JSON.
7. **Session History & Data Ownership**:
   - Non-sensitive session logs with durations, detection counts, and statistical summaries.
   - Detailed session modal inspector.
   - 1-Click "Clear All History" with complete database deletion.
   - CSV export capability.
7. **System & Diagnostics Settings**:
   - Adjustable inference intervals and detection confidence thresholds.
   - Browser hardware and Web Speech diagnostic tests.
8. **Secure Authentication**:
   - PBKDF2-HMAC-SHA256 password hashing with unique cryptographic salts.
   - JWT token authentication with auto-refresh and protected routes.
   - 1-Click test demo account fill for rapid evaluation.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + Custom Cybernetic Glassmorphic UI
- **Icons**: Lucide React
- **Charts**: Recharts
- **Computer Vision**: In-browser neural models (`tinyFaceDetector`, `faceExpressionNet`, `ageGenderNet` via `@vladmandic/face-api`)
- **Speech**: Browser Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

### Backend
- **Framework**: Python FastAPI
- **Database**: SQLite (`ai_vision.db`)
- **Security**: PBKDF2-HMAC-SHA256 & PyJWT
- **Server**: Uvicorn ASGI

---

## 📂 Project Structure

```
real time face analytics/
├── frontend/
│   ├── public/
│   │   ├── models/                # Local neural weights (100% offline ready)
│   │   └── js/face-api.js         # Browser standalone bundle
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # API client with JWT interceptor
│   │   ├── components/
│   │   │   ├── DisclaimerBadge.jsx# Ethical AI & privacy notice chip
│   │   │   ├── FaceCard.jsx       # Multi-face HUD estimate card
│   │   │   ├── Navbar.jsx         # Header with voice status & quick actions
│   │   │   ├── Sidebar.jsx        # Navigation sidebar
│   │   │   └── StatCard.jsx       # Metric KPI cards
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Auth state & user profile
│   │   │   └── VoiceContext.jsx   # Speech recognition & TTS dispatcher
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Hero, feature showcase, privacy notice
│   │   │   ├── LoginPage.jsx      # Login with 1-click demo button
│   │   │   ├── RegisterPage.jsx   # Account registration
│   │   │   ├── DashboardPage.jsx  # Overview metrics & chart previews
│   │   │   ├── LiveCameraPage.jsx # Webcam viewport, canvas reticles & controls
│   │   │   ├── AnalyticsPage.jsx  # Recharts visualizations
│   │   │   ├── HistoryPage.jsx    # Telemetry log table, details & CSV export
│   │   │   ├── SettingsPage.jsx   # Throttle sliders & browser diagnostics
│   │   │   └── PrivacyPage.jsx    # Privacy architecture & ethics statement
│   │   ├── utils/
│   │   │   ├── faceDetection.js   # Face-API engine, demo simulator, reticles
│   │   │   └── speechService.js   # Web Speech API engine
│   │   ├── App.jsx                # Router & layout
│   │   ├── index.css              # Glassmorphism & cybernetic styles
│   │   └── main.jsx               # React entrypoint
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── auth.py                    # PBKDF2 hashing, JWT signing & decoding
│   ├── database.py                # SQLite schema setup & helpers
│   ├── main.py                    # FastAPI routes, CORS, session analytics
│   ├── models.py                  # Pydantic schemas
│   └── requirements.txt           # Python backend dependencies
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚡ Installation & Setup

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.14)
- **Node.js**: v18+ (tested on Node.js v22)

---

### 1. Backend Setup

Open a terminal in the project directory:

```bash
cd backend
python -m pip install -r requirements.txt
```

Run the backend server:

```bash
python -m uvicorn main:app --reload --port 8000
```

The API will start at: `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

Open a second terminal in the project directory:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start at: `http://localhost:5173`

*(Model weights have already been downloaded locally into `frontend/public/models/`, so no additional downloads are required!)*

---

## 🎙️ Voice Control Commands

Click the **Voice Mic** button in the header (or allow microphone permissions) to activate speech commands.

Supported phrases:
- `"Start camera"` — Launches the camera feed and starts face analysis
- `"Stop camera"` — Stops camera hardware and prompts to save telemetry
- `"Start analysis"` — Resumes facial detection processing
- `"Stop analysis"` — Pauses detection loop
- `"Open dashboard"` — Navigates to Dashboard
- `"Show analytics"` — Navigates to Analytics charts
- `"Open history"` — Navigates to History logs
- `"Enable demo mode"` — Toggles simulated demo mode
- `"Disable demo mode"` — Exits demo mode
- `"Logout"` — Logs out of current account

---

## 🎭 Demo Mode

If a webcam is unavailable or permission is denied:
1. Click **Demo Mode** or **Try Demo Mode** in the interface.
2. The application will render simulated dynamic faces with moving bounding boxes, age bands, expressions, and confidence scores.
3. The viewport prominently displays **`⚠ DEMO DATA (SIMULATED)`** to ensure transparency.

---

## 🔧 Camera & Microphone Permissions Troubleshooting

1. **Camera Permission Denied**:
   - Check the lock icon 🔒 next to the browser URL bar.
   - Ensure Camera and Microphone are set to **Allow**.
   - If no hardware camera exists, click **Switch to Demo Mode**.
2. **Speech Recognition Not Responding**:
   - Use a Chromium-based browser (Google Chrome, Microsoft Edge, Brave) which natively supports the Web Speech API.
   - Ensure microphone permission is granted.
3. **CORS / API Errors**:
   - Ensure the FastAPI server is running on port 8000 before initiating login or session saves.
   - Vite is pre-configured with an automatic `/api` proxy pointing to `http://127.0.0.1:8000`.

---

## 🌐 Production Deployment

### Production Build
```bash
cd frontend
npm run build
```
The optimized bundle will be compiled into `frontend/dist/`.

### Serving with FastAPI
You can configure FastAPI to mount `frontend/dist` as a static directory for a single-server deployment:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
```
