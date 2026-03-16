"""
Gemini Live Q&A API request/response models
"""

import time
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


# ====== Session Status ======

class SessionStatus(str, Enum):
    PENDING   = "pending"    # WebSocket not connected
    ACTIVE    = "active"     # Voice conversation in progress
    COMPLETED = "completed"  # Session ended


# ====== Transcript ======

class TranscriptEntry(BaseModel):
    """A single line of conversation history"""
    role: str          # "ai" | "user_text"
    text: str
    timestamp: float = Field(default_factory=time.time)


# ====== Create Session Request ======

class LiveSessionStartRequest(BaseModel):
    """Live session start request"""
    student_info: Dict[str, Any] = Field(default_factory=dict)
    exam_info: Dict[str, Any] = Field(default_factory=dict)
    rag_keys: Optional[List[str]] = None
    system_prompt_override: Optional[str] = None
    study_goals: Optional[List[str]] = None


# ====== Create Session Response ======

class LiveSessionStartResponse(BaseModel):
    """Live session start response"""
    session_id: str
    status: SessionStatus = SessionStatus.PENDING
    message: str = "Session created. Please connect via WebSocket."
    ws_url: str


# ====== WebSocket Message (Server -> Client) ======

class LiveMessageToClient(BaseModel):
    """JSON message sent from server to client"""
    type: str  # "ready" | "transcript" | "error" | "session_end" | "tool_call_start" | "tool_call_end" | "turn_complete"
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# ====== Get Session Response ======

class LiveSessionInfoResponse(BaseModel):
    """Session info response"""
    session_id: str
    status: SessionStatus
    student_info: Dict[str, Any] = Field(default_factory=dict)
    exam_info: Dict[str, Any] = Field(default_factory=dict)
    created_at: float
    ended_at: Optional[float] = None
    has_gemini_connection: bool = False
    transcript_count: int = 0


# ====== Transcript Response ======

class TranscriptResponse(BaseModel):
    """Session conversation history response"""
    session_id: str
    status: SessionStatus
    transcript: List[TranscriptEntry]
    total: int


# ====== Session Result Response ======

class SessionResultResponse(BaseModel):
    """Session final result response"""
    session_id: str
    status: SessionStatus
    student_info: Dict[str, Any]
    exam_info: Dict[str, Any]
    transcript: List[TranscriptEntry]
    missing_points: List[str] = Field(default_factory=list)
    completed_points: List[Dict[str, Any]] = Field(default_factory=list)
    duration_seconds: Optional[float] = None
    created_at: float
    ended_at: Optional[float] = None


# ====== Session List Response ======

class LiveSessionListResponse(BaseModel):
    """Active session list response"""
    sessions: List[LiveSessionInfoResponse]
    total: int
