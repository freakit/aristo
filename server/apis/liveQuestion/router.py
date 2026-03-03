"""
Gemini Live Q&A API 라우터
WebSocket 기반 실시간 오디오 스트리밍 + RAG 검색
"""

import time
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from apis.liveQuestion.models import (
    LiveSessionStartRequest,
    LiveSessionStartResponse,
    LiveSessionInfoResponse,
    LiveSessionListResponse,
    TranscriptResponse,
    SessionResultResponse,
    SessionStatus,
    TranscriptEntry,
)
from apis.liveQuestion.service import (
    create_live_session,
    get_live_session,
    delete_live_session,
    handle_live_session,
    live_sessions,
)

router = APIRouter(prefix="/api/live-question", tags=["Live Question - 실시간 문제 출제"])


# ====== 세션 CRUD ======

@router.post("/session", response_model=LiveSessionStartResponse, summary="세션 생성")
async def api_create_session(req: LiveSessionStartRequest):
    """
    ## Live 세션 생성

    시험 세션을 생성하고 WebSocket 연결 정보를 반환합니다.

    | 필드 | 설명 |
    |---|---|
    | `student_info` | 학생 정보 (name, id 등 자유 형식) |
    | `exam_info` | 시험 정보 — `content` 필드에 시험 주제/안내문 |
    | `rag_keys` | RAG 검색 시 참조할 문서 key 목록 (없으면 null) |
    | `system_prompt_override` | 커스텀 AI 튜터 프롬프트 (없으면 기본값 사용) |

    **응답:** `session_id` + `ws_url` → WebSocket 연결에 사용
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


@router.get("/session/{session_id}", response_model=LiveSessionInfoResponse, summary="세션 정보 조회")
async def api_get_session(session_id: str):
    """세션 상태 및 기본 정보 조회"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    return LiveSessionInfoResponse(
        session_id=session_id,
        status=session.get("status", SessionStatus.PENDING),
        student_info=session.get("student_info", {}),
        exam_info={k: v for k, v in session.get("exam_info", {}).items() if k != "content"},
        created_at=session.get("created_at", 0),
        ended_at=session.get("ended_at"),
        has_gemini_connection=session.get("gemini_session") is not None,
        transcript_count=len(session.get("transcript", [])),
    )


@router.get("/session/{session_id}/transcript", response_model=TranscriptResponse, summary="대화 기록 조회")
async def api_get_transcript(session_id: str):
    """
    ## 세션 대화 기록 조회

    AI 발화 텍스트 및 학생 텍스트 입력 기록을 반환합니다.

    - `role: "ai"` — Gemini AI 발화
    - `role: "user_text"` — 학생 텍스트 입력 (`{"type":"text","content":"..."}`)

    > 실시간 음성 입력은 서버에서 텍스트 변환이 없으므로 기록되지 않습니다.
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    transcript: List[TranscriptEntry] = session.get("transcript", [])
    return TranscriptResponse(
        session_id=session_id,
        status=session.get("status", SessionStatus.PENDING),
        transcript=transcript,
        total=len(transcript),
    )


@router.get("/session/{session_id}/result", response_model=SessionResultResponse, summary="세션 최종 결과")
async def api_get_result(session_id: str):
    """
    ## 세션 최종 결과 조회

    시험 완료 후 전체 결과를 반환합니다.

    | 필드 | 설명 |
    |---|---|
    | `status` | `pending` / `active` / `completed` |
    | `transcript` | 전체 대화 기록 |
    | `duration_seconds` | 시험 소요 시간 (완료된 경우) |
    | `student_info` | 학생 정보 |
    | `exam_info` | 시험 정보 |
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    created_at = session.get("created_at", 0)
    ended_at   = session.get("ended_at")
    duration   = (ended_at - created_at) if ended_at else None

    return SessionResultResponse(
        session_id=session_id,
        status=session.get("status", SessionStatus.PENDING),
        student_info=session.get("student_info", {}),
        exam_info=session.get("exam_info", {}),
        transcript=session.get("transcript", []),
        duration_seconds=duration,
        created_at=created_at,
        ended_at=ended_at,
    )


@router.get("/sessions", response_model=LiveSessionListResponse, summary="세션 목록 조회")
async def api_list_sessions():
    """모든 세션 목록 조회 (진행 중 + 완료)"""
    result = []
    for sid, s in live_sessions.items():
        result.append(LiveSessionInfoResponse(
            session_id=sid,
            status=s.get("status", SessionStatus.PENDING),
            student_info=s.get("student_info", {}),
            exam_info={k: v for k, v in s.get("exam_info", {}).items() if k != "content"},
            created_at=s.get("created_at", 0),
            ended_at=s.get("ended_at"),
            has_gemini_connection=s.get("gemini_session") is not None,
            transcript_count=len(s.get("transcript", [])),
        ))
    return LiveSessionListResponse(sessions=result, total=len(result))


@router.delete("/session/{session_id}", summary="세션 삭제")
async def api_delete_session(session_id: str):
    """세션 삭제 (메모리에서 제거)"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    delete_live_session(session_id)
    return {"message": "세션이 삭제되었습니다.", "session_id": session_id}


# ====== WebSocket 엔드포인트 ======

@router.websocket("/ws/{session_id}")
async def websocket_live_session(websocket: WebSocket, session_id: str):
    """
    ## 실시간 오디오 스트리밍 WebSocket

    ### 클라이언트 → 서버
    | 타입 | 형식 | 설명 |
    |---|---|---|
    | 오디오 | `binary` | PCM 16-bit, 16kHz, mono |
    | 종료 | `{"type":"end"}` | 세션 종료 |
    | 텍스트 | `{"type":"text","content":"..."}` | 텍스트 입력 |

    ### 서버 → 클라이언트
    | 타입 | 형식 | 설명 |
    |---|---|---|
    | 오디오 | `binary` | PCM 16-bit, 24kHz, mono (Gemini 음성) |
    | `ready` | JSON | Gemini 연결 완료 |
    | `transcript` | JSON | AI 발화 텍스트 (자막) |
    | `tool_call_start` | JSON | RAG 검색 시작 |
    | `tool_call_end` | JSON | RAG 검색 완료 |
    | `turn_complete` | JSON | Gemini 한 턴 완료 |
    | `error` | JSON | 오류 발생 |
    """
    session = get_live_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="세션을 찾을 수 없습니다.")
        return

    if session.get("status") == SessionStatus.COMPLETED:
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
        try:
            await websocket.close()
        except Exception:
            pass
        print(f"[{session_id}] 🏁 Live 세션 종료")
