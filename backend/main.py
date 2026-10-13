from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import json
import sqlite3
from typing import List, Dict, Any

from database import get_db, init_db
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from models import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
    UserSettings,
    SessionCreate,
    SessionResponse,
    AnalyticsOverview,
)

# Initialize database schema on startup
init_db()

app = FastAPI(
    title="AI Vision - Real-Time Face Analytics API",
    description="Privacy-first backend for real-time face analytics telemetry, authentication, and session aggregation. Does NOT store images or biometrics.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Vite frontend at localhost:5173 or any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def format_user_response(row: sqlite3.Row) -> dict:
    settings = {}
    if row["settings_json"]:
        try:
            settings = json.loads(row["settings_json"])
        except Exception:
            settings = {}
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": str(row["created_at"]),
        "settings": settings,
    }

def format_session_response(row: sqlite3.Row) -> dict:
    detected_faces = []
    try:
        if "detected_faces_json" in row.keys() and row["detected_faces_json"]:
            detected_faces = json.loads(row["detected_faces_json"])
    except Exception:
        detected_faces = []

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "session_name": row["session_name"],
        "duration_seconds": row["duration_seconds"],
        "total_detections": row["total_detections"],
        "faces_detected_count": row["faces_detected_count"],
        "peak_faces_count": row["peak_faces_count"],
        "avg_age": round(row["avg_age"], 1),
        "primary_expression": row["primary_expression"],
        "dominant_sex_category": row["dominant_sex_category"],
        "expression_breakdown": json.loads(row["expression_breakdown_json"] or "{}"),
        "age_distribution": json.loads(row["age_distribution_json"] or "{}"),
        "sex_distribution": json.loads(row["sex_distribution_json"] or "{}"),
        "detected_faces": detected_faces,
        "created_at": str(row["created_at"]),
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Vision Face Analytics API",
        "privacy": "No camera images, video streams, or biometric templates are stored."
    }

# ----------------- AUTHENTICATION ROUTES ----------------- #

@app.post("/api/auth/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (user_in.email.lower().strip(),))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    pwd_hash = hash_password(user_in.password)
    default_settings = json.dumps({
        "camera_fps": 30,
        "detection_interval_ms": 150,
        "confidence_threshold": 0.5,
        "tts_enabled": True,
        "voice_enabled": True,
        "theme": "dark"
    })
    
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, settings_json) VALUES (?, ?, ?, ?)",
        (user_in.name.strip(), user_in.email.lower().strip(), pwd_hash, default_settings)
    )
    user_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT id, name, email, settings_json, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    token = create_access_token(data={"sub": str(user_id), "email": user_in.email.lower().strip()})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": format_user_response(row)
    }

@app.post("/api/auth/login", response_model=TokenResponse)
def login(creds: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, email, password_hash, settings_json, created_at FROM users WHERE email = ?", (creds.email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    
    if not row or not verify_password(creds.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    token = create_access_token(data={"sub": str(row["id"]), "email": row["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": format_user_response(row)
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return format_user_response(current_user)

@app.put("/api/auth/settings")
def update_settings(settings: UserSettings, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    settings_json = json.dumps(settings.model_dump())
    cursor.execute("UPDATE users SET settings_json = ? WHERE id = ?", (settings_json, current_user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Settings saved successfully", "settings": settings.model_dump()}

# ----------------- SESSION & FACES ROUTES ----------------- #

@app.post("/api/sessions", response_model=SessionResponse)
def create_session(session_in: SessionCreate, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    
    faces_json = json.dumps(session_in.detected_faces or [])

    cursor.execute("""
    INSERT INTO analysis_sessions (
        user_id, session_name, duration_seconds, total_detections,
        faces_detected_count, peak_faces_count, avg_age,
        primary_expression, dominant_sex_category,
        expression_breakdown_json, age_distribution_json, sex_distribution_json,
        detected_faces_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user["id"],
        session_in.session_name or "Live Camera Session",
        session_in.duration_seconds,
        session_in.total_detections,
        session_in.faces_detected_count,
        session_in.peak_faces_count,
        session_in.avg_age,
        session_in.primary_expression,
        session_in.dominant_sex_category,
        json.dumps(session_in.expression_breakdown),
        json.dumps(session_in.age_distribution),
        json.dumps(session_in.sex_distribution),
        faces_json
    ))
    session_id = cursor.lastrowid

    # Also insert each detected face into detected_faces table
    for face in (session_in.detected_faces or []):
        cursor.execute("""
        INSERT INTO detected_faces (
            session_id, user_id, person_label, age_range, sex_category,
            expression, confidence, image_thumbnail
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            current_user["id"],
            face.get("person_label", "Person 1"),
            face.get("age_range", "18–24"),
            face.get("sex_category", "Male"),
            face.get("expression", "Happy"),
            float(face.get("confidence", 85)),
            face.get("image_thumbnail", "")
        ))

    conn.commit()
    
    cursor.execute("SELECT * FROM analysis_sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    
    return format_session_response(row)

@app.get("/api/sessions", response_model=List[SessionResponse])
def get_sessions(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM analysis_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        (current_user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()
    return [format_session_response(r) for r in rows]

@app.get("/api/history/faces")
def get_all_detected_faces(current_user: dict = Depends(get_current_user)):
    """Retrieve all detected persons faces across sessions for the history gallery."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM detected_faces WHERE user_id = ? ORDER BY detected_at DESC LIMIT 300",
        (current_user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "session_id": r["session_id"],
            "user_id": r["user_id"],
            "person_label": r["person_label"],
            "age_range": r["age_range"],
            "sex_category": r["sex_category"],
            "expression": r["expression"],
            "confidence": round(r["confidence"], 1),
            "image_thumbnail": r["image_thumbnail"],
            "detected_at": str(r["detected_at"]),
        }
        for r in rows
    ]

@app.delete("/api/history/faces/{face_id}")
def delete_single_face(face_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detected_faces WHERE id = ? AND user_id = ?", (face_id, current_user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Face record removed"}

@app.delete("/api/sessions")
def clear_sessions(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analysis_sessions WHERE user_id = ?", (current_user["id"],))
    deleted_count = cursor.rowcount
    cursor.execute("DELETE FROM detected_faces WHERE user_id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    return {"message": f"Successfully deleted {deleted_count} session records and all faces history.", "count": deleted_count}

@app.delete("/api/sessions/{session_id}")
def delete_single_session(session_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analysis_sessions WHERE id = ? AND user_id = ?", (session_id, current_user["id"]))
    cursor.execute("DELETE FROM detected_faces WHERE session_id = ? AND user_id = ?", (session_id, current_user["id"]))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Session record not found")
    conn.commit()
    conn.close()
    return {"message": "Session deleted successfully"}

# ----------------- ANALYTICS AGGREGATION ROUTES ----------------- #

@app.get("/api/analytics", response_model=AnalyticsOverview)
def get_analytics(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM analysis_sessions WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return {
            "total_sessions": 0,
            "total_faces_analyzed": 0,
            "avg_session_duration_seconds": 0.0,
            "overall_avg_age": 0.0,
            "most_common_expression": "None",
            "dominant_sex_category": "None",
            "expression_breakdown": {
                "Happy": 0, "Neutral": 0, "Surprised": 0,
                "Sad": 0, "Angry": 0, "Fearful": 0, "Disgusted": 0
            },
            "age_distribution": {
                "0-12": 0, "13-17": 0, "18-24": 0,
                "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0
            },
            "sex_distribution": {
                "Male": 0, "Female": 0, "Undetermined": 0
            },
            "recent_sessions": []
        }
    
    total_sessions = len(rows)
    total_faces = sum(r["faces_detected_count"] for r in rows)
    total_duration = sum(r["duration_seconds"] for r in rows)
    avg_duration = round(total_duration / total_sessions, 1)
    
    # Calculate weighted average age if faces detected
    valid_ages = [r["avg_age"] for r in rows if r["avg_age"] > 0]
    overall_avg_age = round(sum(valid_ages) / len(valid_ages), 1) if valid_ages else 0.0
    
    # Aggregate expression breakdown
    agg_expressions: Dict[str, int] = {
        "Happy": 0, "Neutral": 0, "Surprised": 0,
        "Sad": 0, "Angry": 0, "Fearful": 0, "Disgusted": 0
    }
    agg_ages: Dict[str, int] = {
        "0-12": 0, "13-17": 0, "18-24": 0,
        "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0
    }
    agg_sex: Dict[str, int] = {
        "Male": 0, "Female": 0, "Undetermined": 0
    }
    
    for r in rows:
        try:
            exp_data = json.loads(r["expression_breakdown_json"] or "{}")
            for k, v in exp_data.items():
                agg_expressions[k] = agg_expressions.get(k, 0) + int(v)
        except Exception:
            pass
            
        try:
            age_data = json.loads(r["age_distribution_json"] or "{}")
            for k, v in age_data.items():
                agg_ages[k] = agg_ages.get(k, 0) + int(v)
        except Exception:
            pass
            
        try:
            sex_data = json.loads(r["sex_distribution_json"] or "{}")
            for k, v in sex_data.items():
                agg_sex[k] = agg_sex.get(k, 0) + int(v)
        except Exception:
            pass
            
    # Find most common expression
    top_exp = "Neutral"
    if any(agg_expressions.values()):
        top_exp = max(agg_expressions.items(), key=lambda x: x[1])[0]
        
    # Find dominant sex category
    top_sex = "Undetermined"
    if any(agg_sex.values()):
        top_sex = max(agg_sex.items(), key=lambda x: x[1])[0]
        
    formatted_recent = [format_session_response(r) for r in rows[:10]]
    
    return {
        "total_sessions": total_sessions,
        "total_faces_analyzed": total_faces,
        "avg_session_duration_seconds": avg_duration,
        "overall_avg_age": overall_avg_age,
        "most_common_expression": top_exp,
        "dominant_sex_category": top_sex,
        "expression_breakdown": agg_expressions,
        "age_distribution": agg_ages,
        "sex_distribution": agg_sex,
        "recent_sessions": formatted_recent
    }
