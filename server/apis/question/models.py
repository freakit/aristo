"""
문제 출제 API의 요청/응답 모델
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ====== 요청 모델 ======

class AttachmentItem(BaseModel):
    url: str


class StudentInfo(BaseModel):
    name: Optional[str] = None
    id: Optional[str] = None
    # 추가 필드 허용
    class Config:
        extra = "allow"


class ExamInfo(BaseModel):
    name: Optional[str] = None
    chapter: Optional[str] = None
    content: Optional[str] = None
    # 추가 필드 허용
    class Config:
        extra = "allow"


class TestStartRequest(BaseModel):
    """테스트 시작 요청"""
    student_info: Dict[str, Any]
    exam_info: Dict[str, Any]
    attachments: List[AttachmentItem] = []
    # RAG 검색 시 사용할 key 필터
    rag_keys: Optional[List[str]] = None


class AnswerRequest(BaseModel):
    """답변 제출 요청"""
    session_id: str
    user_input: str


class ContinueSessionRequest(BaseModel):
    """세션 이어하기 요청"""
    student_info: Dict[str, Any]
    exam_info: Dict[str, Any]
    attachments: List[AttachmentItem] = []
    rag_keys: Optional[List[str]] = None


# ====== 응답 모델 ======

class QuestionResponse(BaseModel):
    """질문 응답"""
    session_id: str
    type: str  # "base_question" | "follow_up" | "bonus_question"
    message: str
    tree: Optional[Dict[str, Any]] = None


class FinishResponse(BaseModel):
    """테스트 종료 응답"""
    session_id: str
    type: str = "finish"
    reason: str  # "No More Question" | "Time Out"
    tree: Optional[Dict[str, Any]] = None


class SessionInfoResponse(BaseModel):
    """세션 정보 응답"""
    session_id: str
    active: bool
    student_info: Optional[Dict[str, Any]] = None
    exam_info: Optional[Dict[str, Any]] = None
    tree: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str
    detail: Optional[str] = None
