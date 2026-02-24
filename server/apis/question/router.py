"""
문제 출제 API 라우터
WebSocket 기반이었던 소크라틱 Q&A를 REST API로 변환
"""

import time
from fastapi import APIRouter, HTTPException

from apis.question.models import (
    TestStartRequest, AnswerRequest, ContinueSessionRequest,
    QuestionResponse, FinishResponse, SessionInfoResponse, ErrorResponse,
)
from apis.question.service import (
    create_session, get_session, delete_session,
    start_test, submit_answer, continue_session, end_test,
    sessions,
)

router = APIRouter(prefix="/api/question", tags=["Question - 문제 출제"])


@router.post("/start", response_model=None)
async def api_start_test(req: TestStartRequest):
    """
    테스트 시작

    새 세션을 생성하고 첫 번째 질문을 반환합니다.
    - exam_info.content에 기본 질문 텍스트가 포함되어야 합니다.
    - rag_keys: RAG 검색 시 필터링할 key 목록 (선택)
    """
    session_id = create_session()

    attachment_urls = [a.url for a in req.attachments]
    result = await start_test(
        session_id=session_id,
        student_info=req.student_info,
        exam_info=req.exam_info,
        attachment_urls=attachment_urls,
        rag_keys=req.rag_keys,
    )

    return result


@router.post("/answer", response_model=None)
async def api_submit_answer(req: AnswerRequest):
    """
    답변 제출 & 다음 질문 받기

    학생의 답변을 제출하면:
    1. Missing Point 분석 수행
    2. 후속 질문 생성 또는 테스트 종료
    3. 트리 구조 저장

    반환 type: "follow_up" | "finish"
    """
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    if not session["active"]:
        raise HTTPException(status_code=400, detail="이미 종료된 세션입니다.")

    result = await submit_answer(req.session_id, req.user_input)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/continue", response_model=None)
async def api_continue_session(req: ContinueSessionRequest):
    """
    세션 이어하기

    이전에 저장된 트리 파일을 검색하여 세션을 복구합니다.
    student_info와 exam_info로 최신 트리 파일을 자동 탐색합니다.
    """
    attachment_urls = [a.url for a in req.attachments]
    result = await continue_session(
        student_info=req.student_info,
        exam_info=req.exam_info,
        attachment_urls=attachment_urls,
        rag_keys=req.rag_keys,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/end")
async def api_end_test(session_id: str):
    """
    테스트 강제 종료 (타임아웃 등)
    """
    result = await end_test(session_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/session/{session_id}")
async def api_get_session(session_id: str):
    """
    세션 정보 조회

    현재 세션의 상태, 학생 정보, 트리 구조를 반환합니다.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    tree_data = session["root"]._node_to_dict() if session.get("root") else None

    return {
        "session_id": session_id,
        "active": session["active"],
        "student_info": session.get("student_info"),
        "exam_info": session.get("exam_info"),
        "tree": tree_data,
    }


@router.delete("/session/{session_id}")
async def api_delete_session(session_id: str):
    """세션 삭제"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    delete_session(session_id)
    return {"message": "세션이 삭제되었습니다.", "session_id": session_id}


@router.get("/sessions")
async def api_list_sessions():
    """
    활성 세션 목록 조회
    """
    result = []
    for sid, s in sessions.items():
        result.append({
            "session_id": sid,
            "active": s["active"],
            "student_info": s.get("student_info", {}),
            "exam_info": {k: v for k, v in s.get("exam_info", {}).items() if k != "content"},
            "created_at": s.get("created_at"),
        })
    return {"sessions": result, "total": len(result)}
