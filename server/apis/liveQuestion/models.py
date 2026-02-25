"""
Gemini Live Q&A API의 요청/응답 모델
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


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
    message: str = "세션이 생성되었습니다. WebSocket으로 연결하세요."
    ws_url: str


# ====== WebSocket 메시지 (서버 → 클라이언트) ======

class LiveMessageToClient(BaseModel):
    """서버에서 클라이언트로 보내는 JSON 메시지"""
    type: str  # "ready" | "transcript" | "error" | "session_end" | "tool_call_start" | "tool_call_end"
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# ====== 세션 목록 응답 ======

class LiveSessionInfo(BaseModel):
    """세션 정보 요약"""
    session_id: str
    active: bool
    student_info: Dict[str, Any] = Field(default_factory=dict)
    exam_info: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[float] = None


class LiveSessionListResponse(BaseModel):
    """활성 세션 목록 응답"""
    sessions: List[LiveSessionInfo]
    total: int
