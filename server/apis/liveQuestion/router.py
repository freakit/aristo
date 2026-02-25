"""
Gemini Live Q&A API 라우터
WebSocket 기반 실시간 오디오 스트리밍 + RAG 검색
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from apis.liveQuestion.models import (
    LiveSessionStartRequest,
    LiveSessionStartResponse,
)
from apis.liveQuestion.service import (
    create_live_session,
    get_live_session,
    delete_live_session,
    handle_live_session,
    live_sessions,
)

router = APIRouter(prefix="/api/live-question", tags=["Live Question - 실시간 문제 출제"])


# ====== REST 엔드포인트 ======

@router.post("/session", response_model=LiveSessionStartResponse)
async def api_create_session(req: LiveSessionStartRequest):
    """
    Live 세션 생성

    세션을 생성하고 WebSocket 연결 URL을 반환합니다.
    - student_info: 학생 정보
    - exam_info: 시험 정보 (content에 초기 질문 텍스트)
    - rag_keys: RAG 검색 시 필터링할 key 목록 (선택)
    - system_prompt_override: 커스텀 시스템 프롬프트 (선택)
    """
    session_id = create_live_session(
        student_info=req.student_info,
        exam_info=req.exam_info,
        rag_keys=req.rag_keys,
        system_prompt_override=req.system_prompt_override,
    )

    return LiveSessionStartResponse(
        session_id=session_id,
        ws_url=f"/api/live-question/ws/{session_id}",
    )


@router.get("/sessions")
async def api_list_sessions():
    """활성 Live 세션 목록 조회"""
    result = []
    for sid, s in live_sessions.items():
        result.append({
            "session_id": sid,
            "active": s["active"],
            "student_info": s.get("student_info", {}),
            "exam_info": {
                k: v for k, v in s.get("exam_info", {}).items()
                if k != "content"
            },
            "created_at": s.get("created_at"),
        })
    return {"sessions": result, "total": len(result)}


@router.delete("/session/{session_id}")
async def api_delete_session(session_id: str):
    """Live 세션 삭제"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    delete_live_session(session_id)
    return {"message": "세션이 삭제되었습니다.", "session_id": session_id}


@router.get("/session/{session_id}")
async def api_get_session(session_id: str):
    """Live 세션 정보 조회"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    return {
        "session_id": session_id,
        "active": session["active"],
        "student_info": session.get("student_info"),
        "exam_info": session.get("exam_info"),
        "created_at": session.get("created_at"),
        "has_gemini_connection": session.get("gemini_session") is not None,
    }


# ====== WebSocket 엔드포인트 ======

@router.websocket("/ws/{session_id}")
async def websocket_live_session(websocket: WebSocket, session_id: str):
    """
    실시간 오디오 스트리밍 WebSocket

    프로토콜:
    1. 클라이언트 → 서버: 바이너리 (16-bit PCM, 16kHz, mono)
    2. 서버 → 클라이언트: 바이너리 (16-bit PCM, 24kHz, mono) = Gemini 음성 응답
    3. 서버 → 클라이언트: JSON {"type": "ready" | "transcript" | "tool_call_start" | "tool_call_end" | "turn_complete" | "error"}
    4. 클라이언트 → 서버: JSON {"type": "end"} = 세션 종료
    5. 클라이언트 → 서버: JSON {"type": "text", "content": "..."} = 텍스트 입력
    """
    session = get_live_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="세션을 찾을 수 없습니다.")
        return

    if not session["active"]:
        await websocket.close(code=4001, reason="이미 종료된 세션입니다.")
        return

    await websocket.accept()
    print(f"[{session_id}] 🔗 WebSocket 연결됨")

    try:
        await handle_live_session(session_id, websocket)
    except WebSocketDisconnect:
        print(f"[{session_id}] 🔌 WebSocket 연결 해제")
    except Exception as e:
        print(f"[{session_id}] ❌ WebSocket 오류: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        session["active"] = False
        try:
            await websocket.close()
        except Exception:
            pass
        print(f"[{session_id}] 🏁 Live 세션 종료")
