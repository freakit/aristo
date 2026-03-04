"""
Gemini Live Q&A API의 요청/응답 모델
"""

import time
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ====== 세션 상태 ======

class SessionStatus(str, Enum):
    PENDING   = "pending"    # WebSocket 미연결
    ACTIVE    = "active"     # 음성 대화 진행 중
    COMPLETED = "completed"  # 세션 종료


# ====== 트랜스크립트 ======

class TranscriptEntry(BaseModel):
    """대화 기록 한 줄"""
    role: str          # "ai" | "user_text"
    text: str
    timestamp: float = Field(default_factory=time.time)


# ====== 세션 생성 요청 ======

class LiveSessionStartRequest(BaseModel):
    """Live 세션 시작 요청"""
    student_info: Dict[str, Any] = Field(default_factory=dict)
    exam_info: Dict[str, Any] = Field(default_factory=dict)
    rag_keys: Optional[List[str]] = None
    system_prompt_override: Optional[str] = None


# ====== 세션 생성 응답 ======

class LiveSessionStartResponse(BaseModel):
    """Live 세션 시작 응답"""
    session_id: str
    status: SessionStatus = SessionStatus.PENDING
    message: str = "세션이 생성되었습니다. WebSocket으로 연결하세요."
    ws_url: str


# ====== WebSocket 메시지 (서버 → 클라이언트) ======

class LiveMessageToClient(BaseModel):
    """서버에서 클라이언트로 보내는 JSON 메시지"""
    type: str  # "ready" | "transcript" | "error" | "session_end" | "tool_call_start" | "tool_call_end" | "turn_complete"
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# ====== 세션 조회 응답 ======

class LiveSessionInfoResponse(BaseModel):
    """세션 정보 응답"""
    session_id: str
    status: SessionStatus
    student_info: Dict[str, Any] = Field(default_factory=dict)
    exam_info: Dict[str, Any] = Field(default_factory=dict)
    created_at: float
    ended_at: Optional[float] = None
    has_gemini_connection: bool = False
    transcript_count: int = 0


# ====== 트랜스크립트 응답 ======

class TranscriptResponse(BaseModel):
    """세션 대화 기록 응답"""
    session_id: str
    status: SessionStatus
    transcript: List[TranscriptEntry]
    total: int


# ====== 세션 결과 응답 ======

class SessionResultResponse(BaseModel):
    """세션 최종 결과 응답"""
    session_id: str
    status: SessionStatus
    student_info: Dict[str, Any]
    exam_info: Dict[str, Any]
    transcript: List[TranscriptEntry]
    duration_seconds: Optional[float] = None
    created_at: float
    ended_at: Optional[float] = None


# ====== 세션 목록 응답 ======

class LiveSessionListResponse(BaseModel):
    """활성 세션 목록 응답"""
    sessions: List[LiveSessionInfoResponse]
    total: int
