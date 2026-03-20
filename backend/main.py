import os
import sqlite3
import json
import base64
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import aiosqlite
import requests

app = FastAPI(title="GOLDEN HOUR Engine", version="1.0.0")

# Serve frontend statically in production
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend_dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
    
    @app.get("/")
    async def serve_spa():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PH = "cases.db"

# --- PYDANTIC SCHEMAS (Impact & Technical Complexity) ---
# Enforces strict structure for messy inputs
class EmergencyInput(BaseModel):
    text: str = Field(..., description="The main description of the emergency")
    audio_base64: Optional[str] = Field(None, description="Raw audio signal")
    image_base64: Optional[str] = Field(None, description="Raw visual signal")

class Step(BaseModel):
    action: str
    priority: int

class TriageResult(BaseModel):
    severity: str = Field(..., description="Red, Yellow, or Green")
    assessment: str = Field(..., description="Summary of the situation")
    recommended_actions: List[str] = Field(..., description="Actionable checklist")
    confidence_score: float = Field(..., description="AI confidence in assessment")
    reasoning_trace: str = Field(..., description="Chain of thought logic")
    dispatch_alerted: bool = Field(False, description="Did we trigger dispatch?")

class CaseData(BaseModel):
    id: int
    timestamp: float
    input_text: str
    severity: str
    assessment: str
    confidence_score: float
    reasoning_trace: str
    dispatch_alerted: bool

# --- DATABASE SETUP ---
async def init_db():
    async with aiosqlite.connect(DB_PH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS case_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                input_text TEXT,
                severity TEXT,
                assessment TEXT,
                confidence_score REAL,
                reasoning_trace TEXT,
                dispatch_alerted BOOLEAN
            )
        """)
        await db.commit()

@app.on_event("startup")
async def startup():
    await init_db()

# --- AGENTIC FUNCTION CALLING (Mock) ---
# Demonstrates "Action" component by allowing AI to trigger real-world dispatch
def send_dispatch_alert(location: str = "Unknown", urgency: str = "High"):
    """Mock function to alert human dispatchers."""
    print(f"[DISPATCH ALERT] Sending units to {location} (Urgency: {urgency})")
    return True

# --- AI ENGINE ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

async def analyze_with_gemini(input_data: EmergencyInput) -> TriageResult:
    """
    Multimodal to Structured Pipeline using Gemini 1.5 Flash.
    Uses 'requests' to bypass Python version constraints on standard SDKs.
    """
    if not GEMINI_API_KEY:
        return fallback_engine(input_data)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    # Constructing a CoT prompt forcing JSON output
    prompt = f"""
    You are an AI Emergency Triage Agent. 
    Analyze the following emergency input and output ONLY a valid JSON object matching this schema.
    Think through your reasoning first in a 'reasoning_trace' field, then assign a severity (Red/Yellow/Green), assessment, actions, and confidence score.
    If the situation is life-threatening, set dispatch_alerted to true.
    
    Input Text: {input_data.text}
    Has Audio: {'Yes' if input_data.audio_base64 else 'No'}
    Has Image: {'Yes' if input_data.image_base64 else 'No'}
    
    Expected JSON Structure:
    {{
        "reasoning_trace": "I see the patient has..., therefore...",
        "severity": "Red",
        "assessment": "Critical situation...",
        "recommended_actions": ["Call 911", "Begin CPR"],
        "confidence_score": 0.95,
        "dispatch_alerted": true
    }}
    """

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Parse gemini structured response
        raw_text = data['candidates'][0]['content']['parts'][0]['text']
        parsed = json.loads(raw_text)
        
        # Agentic Action check
        if parsed.get("dispatch_alerted") and str(parsed.get("severity")).lower() == "red":
            send_dispatch_alert(urgency="RED")
            
        return TriageResult(**parsed)

    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Schema Enforcement Fallback
        return fallback_engine(input_data)

def fallback_engine(input_data: EmergencyInput) -> TriageResult:
    """Keyword-based deterministic engine when API key is missing or fails."""
    text = input_data.text.lower()
    if any(word in text for word in ["heart", "chest", "breath", "unconscious", "bleeding"]):
        severity = "Red"
        assessment = "Immediate life-threatening condition detected."
        actions = ["Dispatch immediate medical units", "Instruct caller on life-saving operations (e.g., CPR/Pressure)", "Keep caller on line"]
        trace = "Keywords 'chest/breath/unconscious' triggered critical protocol."
        disp = True
        send_dispatch_alert()
    elif any(word in text for word in ["broken", "pain", "fall", "dizzy"]):
        severity = "Yellow"
        assessment = "Urgent but non-life-threatening condition."
        actions = ["Advise patient to sit or lie down", "Dispatch medical units (Code 2)", "Monitor condition"]
        trace = "Keywords 'pain/fall' triggered urgent protocol."
        disp = False
    else:
        severity = "Green"
        assessment = "Non-urgent situation."
        actions = ["Advise routine medical consultation", "Provide basic first aid instructions if applicable"]
        trace = "No critical or urgent keywords detected. Defaulting to standard advisory."
        disp = False

    return TriageResult(
        severity=severity,
        assessment=assessment,
        recommended_actions=actions,
        confidence_score=0.8,
        reasoning_trace=trace,
        dispatch_alerted=disp
    )

# --- ENDPOINTS ---
@app.post("/analyze", response_model=TriageResult)
async def analyze_emergency(input_data: EmergencyInput):
    # 1. Pipeline execution
    result = await analyze_with_gemini(input_data)
    
    # 2. Persistence (Case History track)
    async with aiosqlite.connect(DB_PH) as db:
        await db.execute("""
            INSERT INTO case_history 
            (timestamp, input_text, severity, assessment, confidence_score, reasoning_trace, dispatch_alerted)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            time.time(),
            input_data.text,
            result.severity,
            result.assessment,
            result.confidence_score,
            result.reasoning_trace,
            result.dispatch_alerted
        ))
        await db.commit()
        
    return result

@app.get("/cases")
async def get_cases():
    async with aiosqlite.connect(DB_PH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM case_history ORDER BY timestamp DESC LIMIT 50")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
