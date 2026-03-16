"""
Gemini Live Q&A API Router
WebSocket-based real-time audio streaming + RAG search
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
    get_session_dir,
)

router = APIRouter(prefix="/api/live-question", tags=["Live Question - Real-time assessment"])


# ====== Session CRUD ======

@router.post("/session", response_model=LiveSessionStartResponse, summary="Create Session")
async def api_create_session(req: LiveSessionStartRequest):
    """
    ## Create Live Session

    Creates an exam session and returns WebSocket connection info.

    | Field | Description |
    |---|---|
    | `student_info` | Student info (free-form, e.g. name, id) |
    | `exam_info` | Exam info — exam topic/instructions in `content` field |
    | `rag_keys` | List of RAG document keys to reference (null if none) |
    | `system_prompt_override` | Custom AI tutor prompt (uses default if none) |

    **Response:** `session_id` + `ws_url` → Use to connect to WebSocket
    """
    session_id = create_live_session(
        student_info=req.student_info,
        exam_info=req.exam_info,
        rag_keys=req.rag_keys,
        system_prompt_override=req.system_prompt_override,
        study_goals=req.study_goals,
    )
    return LiveSessionStartResponse(
        session_id=session_id,
        ws_url=f"/api/live-question/ws/{session_id}",
    )


from pydantic import BaseModel

class GoalGenRequest(BaseModel):
    rag_keys: List[str]

@router.post("/generate-goals", summary="Auto-generate learning goals")
async def api_generate_goals(req: GoalGenRequest):
    """Auto-extracts 3 learning goals from the specified documents (keys)."""
    if not req.rag_keys:
        return {"goals": []}
    
    import os
    from google import genai
    from apis.liveQuestion.service import _generate_initial_goals
    
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    goals = await _generate_initial_goals(req.rag_keys, client.aio)
    return {"goals": goals}


@router.get("/session/{session_id}", response_model=LiveSessionInfoResponse, summary="Get session info")
async def api_get_session(session_id: str):
    """Get session status and basic info"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

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


@router.get("/session/{session_id}/transcript", response_model=TranscriptResponse, summary="Get conversation history")
async def api_get_transcript(session_id: str):
    """
    ## Get session conversation history

    Returns AI speech text and student text input history.

    - `role: "ai"` — Gemini AI speech
    - `role: "user_text"` — Student text input (`{"type":"text","content":"..."}`)

    > Real-time voice inputs are not recorded as there is no server-side text conversion.
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    transcript: List[TranscriptEntry] = session.get("transcript", [])
    return TranscriptResponse(
        session_id=session_id,
        status=session.get("status", SessionStatus.PENDING),
        transcript=transcript,
        total=len(transcript),
    )


@router.get("/session/{session_id}/result", response_model=SessionResultResponse, summary="Session final result")
async def api_get_result(session_id: str):
    """
    ## Get session final result

    Returns the complete results after exam completion.

    | Field | Description |
    |---|---|
    | `status` | `pending` / `active` / `completed` |
    | `transcript` | Complete conversation history |
    | `duration_seconds` | Exam duration (if completed) |
    | `student_info` | Student info |
    | `exam_info` | Exam info |
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    created_at = session.get("created_at", 0)
    ended_at   = session.get("ended_at")
    duration   = (ended_at - created_at) if ended_at else None

    return SessionResultResponse(
        session_id=session_id,
        status=session.get("status", SessionStatus.PENDING),
        student_info=session.get("student_info", {}),
        exam_info=session.get("exam_info", {}),
        transcript=session.get("transcript", []),
        missing_points=session.get("missing_points", []),
        completed_points=session.get("completed_points", []),
        duration_seconds=duration,
        created_at=created_at,
        ended_at=ended_at,
    )


@router.get("/sessions", response_model=LiveSessionListResponse, summary="Get session list")
async def api_list_sessions():
    """Get all sessions (in-progress + completed)"""
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


@router.delete("/session/{session_id}", summary="Delete session")
async def api_delete_session(session_id: str):
    """Delete session (remove from memory)"""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    delete_live_session(session_id)
    return {"message": "Session deleted.", "session_id": session_id}


@router.get("/session/{session_id}/missing", summary="Get missing points list")
async def api_get_missing(session_id: str):
    """
    ## Get missing points list

    Returns a list of items the student missed or explained insufficiently in the current session.
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    missing = session.get("missing_points", [])
    return {
        "session_id": session_id,
        "missing_points": missing,
        "total": len(missing),
    }


@router.get("/session/{session_id}/completed", summary="Get completed points list")
async def api_get_completed(session_id: str):
    """
    ## Get completed points list

    Returns a list of items resolved or directly explained by AI in the current session.
    """
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    completed = session.get("completed_points", [])
    return {
        "session_id": session_id,
        "completed_points": completed,
        "total": len(completed),
    }


# ====== WebSocket Endpoint ======

@router.websocket("/ws/{session_id}")
async def websocket_live_session(websocket: WebSocket, session_id: str):
    """
    ## Real-time Audio Streaming WebSocket

    ### Client → Server
    | Type | Format | Description |
    |---|---|---|
    | Audio | `binary` | PCM 16-bit, 16kHz, mono |
    | End | `{"type":"end"}` | End session |
    | Text | `{"type":"text","content":"..."}` | Text input |

    ### Server → Client
    | Type | Format | Description |
    |---|---|---|
    | Audio | `binary` | PCM 16-bit, 24kHz, mono (Gemini voice) |
    | `ready` | JSON | Gemini connection established |
    | `transcript` | JSON | AI speech text (subtitles) |
    | `tool_call_start` | JSON | RAG search started |
    | `tool_call_end` | JSON | RAG search completed |
    | `turn_complete` | JSON | Gemini completed one turn |
    | `error` | JSON | Error occurred |
    """
    session = get_live_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found.")
        return

    if session.get("status") == SessionStatus.COMPLETED:
        await websocket.close(code=4001, reason="Session already ended.")
        return

    await websocket.accept()
    print(f"[{session_id}] [Connected] WebSocket connected")

    try:
        await handle_live_session(session_id, websocket)
    except WebSocketDisconnect:
        print(f"[{session_id}] [Disconnected] WebSocket disconnected")
    except Exception as e:
        print(f"[{session_id}] [Error] WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
        print(f"[{session_id}] [End] Live session ended")
