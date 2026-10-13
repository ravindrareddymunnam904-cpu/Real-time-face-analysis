import sqlite3
import json
import os
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_vision.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        settings_json TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Analysis sessions table - strictly stores only aggregate metrics and session telemetry.
    # NEVER STORES raw camera frames, videos, face embeddings, or biometrics.
    # Analysis sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_name TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        total_detections INTEGER DEFAULT 0,
        faces_detected_count INTEGER DEFAULT 0,
        peak_faces_count INTEGER DEFAULT 1,
        avg_age REAL DEFAULT 0,
        primary_expression TEXT DEFAULT 'Neutral',
        dominant_sex_category TEXT DEFAULT 'Not Specified',
        expression_breakdown_json TEXT DEFAULT '{}',
        age_distribution_json TEXT DEFAULT '{}',
        sex_distribution_json TEXT DEFAULT '{}',
        detected_faces_json TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)

    # Try adding detected_faces_json column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE analysis_sessions ADD COLUMN detected_faces_json TEXT DEFAULT '[]'")
    except Exception:
        pass

    # Individual detected faces table for History faces gallery
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detected_faces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER NOT NULL,
        person_label TEXT DEFAULT 'Person 1',
        age_range TEXT DEFAULT '18–24',
        sex_category TEXT DEFAULT 'Male',
        expression TEXT DEFAULT 'Happy',
        confidence REAL DEFAULT 85,
        image_thumbnail TEXT DEFAULT '',
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
