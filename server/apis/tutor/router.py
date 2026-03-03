"""
튜터 모드 API 라우터

엔드포인트:
  POST /api/tutor/start        — 튜터 세션 시작 (설명 + 첫 질문)
  POST /api/tutor/reply        — 학생 답변 제출 (피드백 + 보충 + 다음 질문)
  POST /api/tutor/end          — 세션 종료 + 학습 요약
  GET  /api/tutor/session/{id} — 세션 상태 조회
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apis.tutor.service import (
    create_tutor_session,
    get_tutor_session,
    tutor_start,
    tutor_reply,
    tutor_end,
)

router = APIRouter(prefix="/api/tutor", tags=["Tutor - AI 튜터"])


# ──────────────────────────────────────────────────────────────────────────────
# 요청/응답 모델
# ──────────────────────────────────────────────────────────────────────────────

class TutorStartRequest(BaseModel):
    """튜터 세션 시작 요청"""
    topic: str                              # 학습할 주제 (예: "운영체제의 페이징")
    rag_keys: Optional[List[str]] = None    # 참조할 벡터 DB 키 목록


class TutorReplyRequest(BaseModel):
    """학생 답변 제출"""
    session_id: str
    answer: str                             # 학생의 구술/텍스트 답변


class TutorEndRequest(BaseModel):
    """세션 종료"""
    session_id: str


# ──────────────────────────────────────────────────────────────────────────────
# 라우터
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/start")
async def api_tutor_start(req: TutorStartRequest):
    """
    튜터 세션 시작

    1. RAG로 주제 관련 문서 검색
    2. AI가 개념 설명 작성
    3. 이해 확인 첫 질문 생성

    **Response:**
    ```json
    {
      "session_id": "uuid",
      "type": "explain",
      "explanation": "개념 설명 텍스트...",
      "key_concepts": ["개념1", "개념2"],
      "question": "이해 확인 질문",
      "turn": 1
    }
    ```
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="topic은 비워둘 수 없습니다.")

    session_id = create_tutor_session()
    result = await tutor_start(
        session_id=session_id,
        topic=req.topic.strip(),
        rag_keys=req.rag_keys,
    )
    return result


@router.post("/reply")
async def api_tutor_reply(req: TutorReplyRequest):
    """
    학생 답변 제출

    1. Missing Point 분석 (기존 소크라틱 엔진 재활용)
    2. 피드백 + 보충 설명 생성
    3. 다음 질문 생성 또는 세션 완료

    **Response type: "guide"** (더 학습 필요):
    ```json
    {
      "session_id": "...",
      "type": "guide",
      "feedback": "좋은 시도입니다! ...",
      "supplement": "추가로 알아야 할 것은...",
      "question": "다음 소크라틱 질문",
      "is_complete": false,
      "turn": 2
    }
    ```

    **Response type: "complete"** (학습 완료):
    ```json
    {
      "session_id": "...",
      "type": "complete",
      "feedback": "훌륭합니다! ...",
      "supplement": "핵심 개념을 잘 이해하셨습니다.",
      "question": null,
      "is_complete": true,
      "turn": 3
    }
    ```
    """
    session = get_tutor_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    if not session["active"]:
        raise HTTPException(status_code=400, detail="이미 종료된 세션입니다.")
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="answer는 비워둘 수 없습니다.")

    result = await tutor_reply(
        session_id=req.session_id,
        student_answer=req.answer.strip(),
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/end")
async def api_tutor_end(req: TutorEndRequest):
    """
    세션 종료 + 학습 요약

    **Response:**
    ```json
    {
      "session_id": "...",
      "type": "summary",
      "summary": "오늘 페이징 개념을 학습했습니다...",
      "strengths": ["페이지 테이블 구조 이해", "주소 변환 과정"],
      "areas_to_review": ["TLB 역할"],
      "total_turns": 4
    }
    ```
    """
    session = get_tutor_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    result = await tutor_end(req.session_id)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.get("/session/{session_id}")
async def api_tutor_session_info(session_id: str):
    """
    세션 현재 상태 조회
    """
    session = get_tutor_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    return {
        "session_id": session_id,
        "topic": session["topic"],
        "active": session["active"],
        "turn": session["turn"],
        "history_count": len(session["history"]),
        "covered_concepts": session["covered_concepts"],
    }
