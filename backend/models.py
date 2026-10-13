from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSettings(BaseModel):
    camera_fps: int = 30
    detection_interval_ms: int = 150
    confidence_threshold: float = 0.5
    tts_enabled: bool = True
    voice_enabled: bool = True
    theme: str = "dark"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: str
    settings: Dict[str, Any]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class FaceRecord(BaseModel):
    id: int
    session_id: Optional[int] = None
    user_id: int
    person_label: str
    age_range: str
    sex_category: str
    expression: str
    confidence: float
    image_thumbnail: Optional[str] = ""
    detected_at: str

class SessionCreate(BaseModel):
    session_name: Optional[str] = "Live Camera Session"
    duration_seconds: int = 0
    total_detections: int = 0
    faces_detected_count: int = 0
    peak_faces_count: int = 1
    avg_age: float = 0.0
    primary_expression: str = "Neutral"
    dominant_sex_category: str = "Not Specified"
    expression_breakdown: Dict[str, int] = {}
    age_distribution: Dict[str, int] = {}
    sex_distribution: Dict[str, int] = {}
    detected_faces: Optional[List[Dict[str, Any]]] = []

class SessionResponse(BaseModel):
    id: int
    user_id: int
    session_name: str
    duration_seconds: int
    total_detections: int
    faces_detected_count: int
    peak_faces_count: int
    avg_age: float
    primary_expression: str
    dominant_sex_category: str
    expression_breakdown: Dict[str, int]
    age_distribution: Dict[str, int]
    sex_distribution: Dict[str, int]
    detected_faces: List[Dict[str, Any]] = []
    created_at: str

class AnalyticsOverview(BaseModel):
    total_sessions: int
    total_faces_analyzed: int
    avg_session_duration_seconds: float
    overall_avg_age: float
    most_common_expression: str
    dominant_sex_category: str
    expression_breakdown: Dict[str, int]
    age_distribution: Dict[str, int]
    sex_distribution: Dict[str, int]
    recent_sessions: List[SessionResponse]
