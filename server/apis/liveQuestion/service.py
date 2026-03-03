"""
Gemini Live Q&A 서비스 모듈
- Gemini Live API (WebSocket) 세션 관리
- ChromaDB RAG 검색 연동 (Function Calling)
- 실시간 오디오 스트리밍 처리
- 트랜스크립트 저장
"""

import os
import time
import asyncio
import json
from uuid import uuid4
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from apis.rag.vectordb import VectorDBManager
from apis.liveQuestion.prompts import LIVE_TUTOR_SYSTEM_PROMPT, LIVE_TUTOR_SYSTEM_PROMPT_KR
from apis.liveQuestion.models import SessionStatus, TranscriptEntry

# ====== 설정 ======

GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL",
    "gemini-2.5-flash-native-audio-preview-12-2025",
)
RAG_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))

# 오디오 설정
SEND_SAMPLE_RATE    = 16000   # 입력: 16kHz 16-bit PCM mono
RECEIVE_SAMPLE_RATE = 24000   # 출력: 24kHz 16-bit PCM mono

# ====== 세션 저장소 (in-memory) ======
live_sessions: Dict[str, Dict[str, Any]] = {}

# ====== VectorDB 인스턴스 (공유) ======
_vector_db: Optional[VectorDBManager] = None


def get_vector_db() -> VectorDBManager:
    """VectorDBManager 싱글톤 인스턴스 반환"""
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDBManager()
    return _vector_db


# ====== search_db 도구 정의 ======

SEARCH_DB_DECLARATION = {
    "name": "search_db",
    "description": (
        "Search the course materials database (ChromaDB) for relevant content. "
        "Use this tool to retrieve reference materials before asking questions "
        "or to verify a student's answer against the actual course content."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query — a keyword, concept, or phrase to look up in the course materials.",
            },
        },
        "required": ["query"],
    },
}


def execute_search_db(query: str, keys: Optional[List[str]] = None) -> str:
    """
    ChromaDB에서 하이브리드 검색 수행.
    Gemini Live의 tool_call에 대한 응답으로 사용.
    """
    try:
        db = get_vector_db()
        results = db.hybrid_search(
            query=query,
            n_results=RAG_TOP_K,
            use_reranking=True,
            keys=keys,
        )

        if not results:
            return "검색 결과가 없습니다."

        chunks = []
        for r in results:
            text = r.get("content", "")
            source = r.get("metadata", {}).get("source", "")
            if text:
                header = f"[출처: {source}]" if source else ""
                chunks.append(f"{header}\n{text}" if header else text)

        result_text = "\n\n---\n\n".join(chunks)
        print(f"🔍 [search_db] query='{query}' | results={len(results)} | length={len(result_text)}")
        return result_text

    except Exception as e:
        print(f"⚠️ [search_db] 검색 실패: {e}")
        return f"검색 중 오류 발생: {str(e)}"


# ====== 세션 관리 ======

def create_live_session(
    student_info: Dict[str, Any],
    exam_info: Dict[str, Any],
    rag_keys: Optional[List[str]] = None,
    system_prompt_override: Optional[str] = None,
) -> str:
    """Live 세션 생성 후 session_id 반환"""
    session_id = str(uuid4())

    live_sessions[session_id] = {
        "student_info": student_info,
        "exam_info": exam_info,
        "rag_keys": rag_keys,
        "system_prompt": system_prompt_override or LIVE_TUTOR_SYSTEM_PROMPT_KR,
        "status": SessionStatus.PENDING,
        "transcript": [],           # List[TranscriptEntry]
        "created_at": time.time(),
        "ended_at": None,
        "active": True,
        "gemini_session": None,
    }

    print(f"[{session_id}] 🎙️ Live 세션 생성됨 (status=pending)")
    return session_id


def get_live_session(session_id: str) -> Optional[Dict[str, Any]]:
    return live_sessions.get(session_id)


def delete_live_session(session_id: str):
    session = live_sessions.pop(session_id, None)
    if session:
        print(f"[{session_id}] 🗑️ Live 세션 삭제됨")


def _append_transcript(session: Dict[str, Any], role: str, text: str):
    """트랜스크립트에 항목 추가"""
    if text and text.strip():
        entry = TranscriptEntry(role=role, text=text.strip(), timestamp=time.time())
        session["transcript"].append(entry)


def build_live_config(session: Dict[str, Any]) -> dict:
    """Gemini Live API 연결 설정 빌드"""
    system_prompt = session["system_prompt"]

    exam_content = session["exam_info"].get("content", "")
    exam_name    = session["exam_info"].get("name", "")
    if exam_content:
        system_prompt += (
            f"\n\n## 시험 정보\n"
            f"- 시험명: {exam_name}\n"
            f"- 출제 범위/질문:\n{exam_content}"
        )

    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": system_prompt,
        "tools": [{"function_declarations": [SEARCH_DB_DECLARATION]}],
    }


# ====== 세션 메인 루프 ======

async def handle_live_session(session_id: str, websocket) -> None:
    """
    Gemini Live 세션의 메인 루프.
    프론트엔드 WebSocket ↔ Gemini Live API 간 브리지 역할.
    """
    session = live_sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "세션을 찾을 수 없습니다."})
        return

    rag_keys = session.get("rag_keys")
    config   = build_live_config(session)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY가 설정되지 않았습니다."})
        return

    client = genai.Client(api_key=api_key)

    # 상태: pending → active
    session["status"] = SessionStatus.ACTIVE

    try:
        async with client.aio.live.connect(
            model=GEMINI_LIVE_MODEL,
            config=config,
        ) as gemini_session:
            session["gemini_session"] = gemini_session

            await websocket.send_json({
                "type": "ready",
                "message": "Gemini Live 연결 완료. 오디오 스트리밍을 시작하세요.",
                "data": {
                    "send_sample_rate":    SEND_SAMPLE_RATE,
                    "receive_sample_rate": RECEIVE_SAMPLE_RATE,
                },
            })
            print(f"[{session_id}] ✅ Gemini Live 연결 완료 (status=active)")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(_forward_client_to_gemini(session_id, websocket, gemini_session, session))
                tg.create_task(_forward_gemini_to_client(session_id, websocket, gemini_session, rag_keys, session))

    except asyncio.CancelledError:
        print(f"[{session_id}] 세션 취소됨")
    except Exception as e:
        print(f"[{session_id}] ❌ Gemini Live 오류: {e}")
        try:
            await websocket.send_json({"type": "error", "message": f"Gemini Live 오류: {str(e)}"})
        except Exception:
            pass
    finally:
        _finish_session(session_id)
        print(f"[{session_id}] 🔌 Gemini Live 연결 종료 (status=completed)")


def _finish_session(session_id: str):
    """세션 종료 처리"""
    session = live_sessions.get(session_id)
    if session:
        session["status"]       = SessionStatus.COMPLETED
        session["active"]       = False
        session["ended_at"]     = time.time()
        session["gemini_session"] = None


# ====== 내부 태스크 ======

async def _forward_client_to_gemini(
    session_id: str,
    websocket,
    gemini_session,
    session: Dict[str, Any],
) -> None:
    """클라이언트 → Gemini: 오디오 바이너리 & 텍스트 메시지 포워딩"""
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                print(f"[{session_id}] 클라이언트 연결 해제")
                break

            # 바이너리 = PCM 오디오
            if "bytes" in message and message["bytes"]:
                await gemini_session.send_realtime_input(
                    audio={"data": message["bytes"], "mime_type": "audio/pcm"}
                )

            # 텍스트 = JSON 제어 메시지
            elif "text" in message and message["text"]:
                try:
                    msg = json.loads(message["text"])
                    msg_type = msg.get("type", "")

                    if msg_type == "end":
                        print(f"[{session_id}] 클라이언트 세션 종료 요청")
                        break

                    elif msg_type == "text":
                        text_content = msg.get("content", "")
                        if text_content:
                            _append_transcript(session, "user_text", text_content)
                            await gemini_session.send_client_content(
                                turns={"parts": [{"text": text_content}]}
                            )
                except json.JSONDecodeError:
                    pass

    except Exception as e:
        print(f"[{session_id}] ⚠️ 클라이언트→Gemini 포워딩 오류: {e}")


async def _forward_gemini_to_client(
    session_id: str,
    websocket,
    gemini_session,
    rag_keys: Optional[List[str]],
    session: Dict[str, Any],
) -> None:
    """Gemini → 클라이언트: 오디오 응답 & tool_call 처리"""
    try:
        while True:
            turn = gemini_session.receive()
            async for response in turn:

                # 1) 오디오 → 클라이언트로 바이너리 전송
                if response.data is not None:
                    await websocket.send_bytes(response.data)

                # 2) Tool Call → search_db 실행 → tool_response 전송
                elif response.tool_call:
                    await _handle_tool_calls(
                        session_id, gemini_session, websocket,
                        response.tool_call, rag_keys,
                    )

                # 3) 서버 컨텐츠 (텍스트, 턴 완료)
                elif response.server_content:
                    sc = response.server_content

                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if hasattr(part, "text") and part.text:
                                # 트랜스크립트 저장
                                _append_transcript(session, "ai", part.text)
                                await websocket.send_json({
                                    "type": "transcript",
                                    "message": part.text,
                                })

                    if sc.turn_complete:
                        await websocket.send_json({"type": "turn_complete"})

    except asyncio.CancelledError:
        raise
    except Exception as e:
        print(f"[{session_id}] ⚠️ Gemini→클라이언트 포워딩 오류: {e}")


async def _handle_tool_calls(
    session_id: str,
    gemini_session,
    websocket,
    tool_call,
    rag_keys: Optional[List[str]] = None,
) -> None:
    """Gemini의 tool_call을 처리하고 결과를 돌려보냄"""
    function_responses = []

    for fc in tool_call.function_calls:
        print(f"[{session_id}] 🔧 Tool Call: {fc.name}({fc.args})")

        await websocket.send_json({
            "type": "tool_call_start",
            "message": "학습 자료 검색 중...",
            "data": {"tool": fc.name, "args": dict(fc.args)},
        })

        if fc.name == "search_db":
            query = fc.args.get("query", "")
            loop  = asyncio.get_running_loop()
            result_text = await loop.run_in_executor(
                None, execute_search_db, query, rag_keys,
            )
        else:
            result_text = f"알 수 없는 도구: {fc.name}"

        function_responses.append(types.FunctionResponse(
            id=fc.id,
            name=fc.name,
            response={"result": result_text},
        ))

        await websocket.send_json({
            "type": "tool_call_end",
            "message": "검색 완료. 응답 생성 중...",
            "data": {"tool": fc.name},
        })

    await gemini_session.send_tool_response(function_responses=function_responses)
    print(f"[{session_id}] ✅ Tool Response 전송 완료 ({len(function_responses)}개)")
