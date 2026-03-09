"""
Gemini Live Q&A 서비스 모듈
- Gemini Live API (WebSocket) 세션 관리
- ChromaDB RAG 검색 연동 (Function Calling)
- Missing / Completed 포인트 추적 (add_missing_point / mark_completed)
- 실시간 오디오 스트리밍 처리
- 트랜스크립트 저장
"""

import os
import time
import asyncio
import json
from pathlib import Path
from uuid import uuid4
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from apis.rag.vectordb import VectorDBManager
from apis.liveQuestion.prompts import LIVE_TUTOR_SYSTEM_PROMPT
from apis.liveQuestion.models import SessionStatus, TranscriptEntry

async def _generate_initial_goals(keys: List[str], aio_client) -> List[str]:
    loop = asyncio.get_running_loop()
    
    def fetch_docs():
        db = get_vector_db()
        keys_filter = db._build_keys_filter(keys)
        if not keys_filter:
            print("[Warning] keys_filter is empty. (Missing or invalid key list)")
            return []
        docs = db.collection.get(where=keys_filter, include=["documents"])
        if not docs or not docs.get("documents"):
            print("[Warning] No document content found. keys_filter:", keys_filter)
            return []
        return docs["documents"]
        
    doc_list = await loop.run_in_executor(None, fetch_docs)
    if not doc_list:
        print("[Warning] doc_list is empty. Aborting extraction.")
        return []
    
    text = "\n\n".join(doc_list[:50])
    print(f"[Docs] Model input text: {text[:200]}... (Total {len(text)} chars)")

    prompt = (
        "Based on the following learning materials, extract exactly 3 core concepts or learning goals that the student must master today. "
        "Formulate them as specific sentences (e.g., 'Can explain the difference between X and Y', 'Understands the necessity of Z'). "
        "Output exactly 3 lines, one goal per line. Do not use numbers, bullets, or any prefixes. "
        "Just 3 clean sentences.\n\n[Materials]\n" + text
    )
    
    try:
        response = await aio_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        print("[Gemini] Response:", response.text)
        lines = response.text.strip().split("\n")
        goals = [line.strip("- *0123456789. ") for line in lines if line.strip()]
        return goals[:5]
    except Exception as e:
        print(f"Goal generation err: {e}")
        return []

# ====== 설정 ======

GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL",
    "gemini-2.5-flash-native-audio-preview-12-2025",
)
RAG_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))

# 오디오 설정
SEND_SAMPLE_RATE    = 16000   # 입력: 16kHz 16-bit PCM mono
RECEIVE_SAMPLE_RATE = 24000   # 출력: 24kHz 16-bit PCM mono

# Missing / Completed 파일 저장 기본 경로
SESSIONS_DIR = Path(__file__).parent.parent.parent / "sessions"

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


# ====== Tool 선언 ======

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

ADD_MISSING_POINT_DECLARATION = {
    "name": "add_missing_point",
    "description": (
        "학생이 답변에서 누락했거나 불충분하게 설명한 개념/포인트를 Missing 목록에 등록합니다. "
        "학생의 답변을 평가한 후, 부족하다고 판단되는 부분마다 이 도구를 호출하세요. "
        "이미 Missing 목록에 있는 항목은 중복 등록하지 마세요."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "point": {
                "type": "string",
                "description": "누락된 개념이나 설명 부족 포인트를 한 문장으로 간결하게 작성하세요. 예: '스택의 push/pop 시간복잡도 미언급'",
            },
        },
        "required": ["point"],
    },
}

MARK_COMPLETED_DECLARATION = {
    "name": "mark_completed",
    "description": (
        "Missing 목록에 있는 항목이 해결되었을 때 호출합니다. "
        "학생이 해당 개념을 올바르게 설명했거나, AI 튜터가 직접 설명을 완료했을 때 사용하세요. "
        "해당 항목은 Missing에서 제거되고 Completed로 이동됩니다."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "point": {
                "type": "string",
                "description": "완료된 항목 — Missing 목록에 등록된 것과 정확히 같은 텍스트를 사용하세요.",
            },
            "how_resolved": {
                "type": "string",
                "description": "어떻게 해결되었는지 간단히 설명. 예: '학생이 올바르게 설명함' 또는 'AI가 직접 설명함'",
            },
        },
        "required": ["point", "how_resolved"],
    },
}


# ====== MD 파일 관리 ======

def get_session_dir(session_id: str) -> Path:
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def save_md_files(session_id: str) -> None:
    """Missing.md 와 Completed.md 를 디스크에 저장"""
    session = live_sessions.get(session_id)
    if not session:
        return

    session_dir = get_session_dir(session_id)
    missing_points    = session.get("missing_points", [])
    completed_points  = session.get("completed_points", [])

    # Missing.md
    missing_lines = ["# Missing Points\n",
                     "_학생이 누락하거나 불충분하게 설명한 항목들_\n\n"]
    if missing_points:
        for p in missing_points:
            missing_lines.append(f"- [ ] {p}\n")
    else:
        missing_lines.append("_(없음)_\n")

    (session_dir / "Missing.md").write_text(
        "".join(missing_lines), encoding="utf-8"
    )

    # Completed.md
    completed_lines = ["# Completed Points\n",
                       "_해결되거나 AI가 직접 설명한 항목들_\n\n"]
    if completed_points:
        for entry in completed_points:
            point        = entry.get("point", "")
            how_resolved = entry.get("how_resolved", "")
            completed_lines.append(f"- [x] {point}")
            if how_resolved:
                completed_lines.append(f"  _(→ {how_resolved})_")
            completed_lines.append("\n")
    else:
        completed_lines.append("_(없음)_\n")

    (session_dir / "Completed.md").write_text(
        "".join(completed_lines), encoding="utf-8"
    )

    print(f"[{session_id}] MD 파일 저장됨 "
          f"(missing={len(missing_points)}, completed={len(completed_points)})")


# ====== Tool 실행 함수 ======

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
        print(f"[Search] [search_db] query='{query}' | results={len(results)} | length={len(result_text)}")
        return result_text

    except Exception as e:
        print(f"[Warning] [search_db] 검색 실패: {e}")
        return f"검색 중 오류 발생: {str(e)}"


def execute_add_missing_point(session_id: str, point: str) -> str:
    """Missing 목록에 포인트 추가"""
    session = live_sessions.get(session_id)
    if not session:
        return "세션을 찾을 수 없습니다."

    missing = session.setdefault("missing_points", [])

    # 중복 방지
    if point in missing:
        return f"이미 Missing 목록에 있습니다: {point}"

    missing.append(point)
    save_md_files(session_id)

    print(f"[{session_id}] ➕ Missing 추가: {point}")
    return f"Missing 목록에 추가됨: '{point}' (현재 {len(missing)}개)"


def execute_mark_completed(session_id: str, point: str, how_resolved: str) -> str:
    """Missing → Completed 이동"""
    session = live_sessions.get(session_id)
    if not session:
        return "세션을 찾을 수 없습니다."

    missing    = session.setdefault("missing_points", [])
    completed  = session.setdefault("completed_points", [])

    if point not in missing:
        # 목록에 없어도 Completed에는 추가 (유연성)
        print(f"[{session_id}] [Warning] mark_completed: Missing에 없는 항목: {point}")
    else:
        missing.remove(point)

    completed.append({"point": point, "how_resolved": how_resolved, "timestamp": time.time()})
    save_md_files(session_id)

    print(f"[{session_id}] [OK] Moved to Completed: {point} ({how_resolved})")
    remaining = len(missing)
    return (
        f"'{point}' → Successfully moved to Completed. "
        f"Remaining Missing: {remaining}"
        + (" - All goals resolved!" if remaining == 0 else "")
    )


# ====== 세션 관리 ======

def create_live_session(
    student_info: Dict[str, Any],
    exam_info: Dict[str, Any],
    rag_keys: Optional[List[str]] = None,
    system_prompt_override: Optional[str] = None,
    study_goals: Optional[List[str]] = None,
) -> str:
    """Live 세션 생성 후 session_id 반환"""
    session_id = str(uuid4())

    live_sessions[session_id] = {
        "student_info": student_info,
        "exam_info": exam_info,
        "rag_keys": rag_keys,
        "system_prompt": system_prompt_override or LIVE_TUTOR_SYSTEM_PROMPT,
        "status": SessionStatus.PENDING,
        "transcript": [],           # List[TranscriptEntry]
        "missing_points": study_goals or [],       # Set goals immediately
        "completed_points": [],     # List[Dict] {point, how_resolved, timestamp}
        "created_at": time.time(),
        "ended_at": None,
        "active": True,
        "gemini_session": None,
    }

    # 초기 빈 MD 파일 생성
    save_md_files(session_id)

    print(f"[{session_id}] [Live] Live 세션 생성됨 (status=pending)")
    return session_id


def get_live_session(session_id: str) -> Optional[Dict[str, Any]]:
    return live_sessions.get(session_id)


def delete_live_session(session_id: str):
    session = live_sessions.pop(session_id, None)
    if session:
        print(f"[{session_id}] [Cleanup] Live 세션 삭제됨")


def _append_transcript(session: Dict[str, Any], role: str, text: str):
    """트랜스크립트에 항목 추가"""
    if text and text.strip():
        entry = TranscriptEntry(role=role, text=text.strip(), timestamp=time.time())
        session["transcript"].append(entry)


def build_live_config(session: Dict[str, Any]) -> dict:
    """Gemini Live API 연결 설정 빌드"""
    system_prompt = session["system_prompt"]

    exam_content      = session["exam_info"].get("content", "")
    exam_name         = session["exam_info"].get("name", "")
    first_question    = session["exam_info"].get("first_question", "")

    if exam_content or exam_name:
        system_prompt += (
            f"\n\n## 시험 정보\n"
            f"- 시험명: {exam_name}\n"
            f"- 움제 범위/안내:\n{exam_content}"
        )

    if first_question:
        system_prompt += (
            f"\n\n## 첫 번째 질문 (시스템 제공)\n"
            f"세션이 시작되면 다음 질문을 학생에게 말해주세요:\n"
            f"\"{first_question}\""
        )

    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": system_prompt,
        # 사용자 음성 자막 + AI 음성 자막 활성화
        "input_audio_transcription":  {},
        "output_audio_transcription": {},
        "tools": [{
            "function_declarations": [
                SEARCH_DB_DECLARATION,
                ADD_MISSING_POINT_DECLARATION,
                MARK_COMPLETED_DECLARATION,
            ]
        }],
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

    # Initial update to frontend for already-populated missing points
    if session.get("missing_points"):
        await websocket.send_json({
            "type": "missing_update",
            "data": {
                "missing_points": session["missing_points"],
                "completed_points": []
            }
        })

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
                "message": "Gemini Live connected. You can start audio streaming.",
                "data": {
                    "send_sample_rate":    SEND_SAMPLE_RATE,
                    "receive_sample_rate": RECEIVE_SAMPLE_RATE,
                },
            })
            print(f"[{session_id}] [OK] Gemini Live connected (status=active)")

            # 첫 질문 시스템 주입
            first_question = session["exam_info"].get("first_question", "")
            if first_question:
                await _inject_first_question(session_id, gemini_session, first_question)

            async with asyncio.TaskGroup() as tg:
                tg.create_task(_forward_client_to_gemini(session_id, websocket, gemini_session, session))
                tg.create_task(_forward_gemini_to_client(session_id, websocket, gemini_session, rag_keys, session))

    except asyncio.CancelledError:
        print(f"[{session_id}] Session cancelled")
        try:
            await websocket.send_json({"type": "session_end", "reason": "cancelled", "message": "Session was cancelled."})
        except Exception:
            pass
    except Exception as e:
        err_msg = str(e)
        print(f"[{session_id}] [Error] Gemini Live error: {err_msg}")
        try:
            await websocket.send_json({"type": "error", "message": f"Gemini error: {err_msg}"})
        except Exception:
            pass
        try:
            await websocket.send_json({"type": "error", "message": f"Gemini Live 오류: {err_msg}"})
        except Exception:
            pass
    finally:
        _finish_session(session_id)
        try:
            await websocket.send_json({"type": "session_end", "reason": "finished", "message": "세션이 종료되었습니다."})
        except Exception:
            pass
        print(f"[{session_id}] [Closed] Gemini Live 연결 종료 (status=completed)")


def _finish_session(session_id: str):
    """세션 종료 처리"""
    session = live_sessions.get(session_id)
    if session:
        session["status"]       = SessionStatus.COMPLETED
        session["active"]       = False
        session["ended_at"]     = time.time()
        session["gemini_session"] = None
        # 최종 MD 파일 저장
        save_md_files(session_id)


# ====== 첫 질문 주입 ======

async def _inject_first_question(
    session_id: str,
    gemini_session,
    first_question: str,
) -> None:
    """
    세션 시작 시 시스템이 첫 번째 질문을 Gemini에 주입.
    Gemini는 이 텍스트를 받아 음성으로 학생에게 질문한다.
    """
    instruction = (
        f"지금 학생에게 다음 질문을 음성으로 말해주세요. "
        f"질문 외에 다른 말은 하지 마세요:\n\n\"{first_question}\""
    )
    try:
        await gemini_session.send_client_content(
            turns={"parts": [{"text": instruction}]},
            turn_complete=True,
        )
        print(f"[{session_id}] [Msg] 첫 질문 주입됨: {first_question[:50]}...")
    except Exception as e:
        print(f"[{session_id}] [Warning] 첫 질문 주입 실패: {e}")


# ====== 내부 태스크 ======

async def _forward_client_to_gemini(
    session_id: str,
    websocket,
    gemini_session,
    session: Dict[str, Any],
) -> None:
    """클라이언트 → Gemini: 오디오 바이너리 & 텍스트 메시지 포워딩"""
    import base64
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                print(f"[{session_id}] 클라이언트 연결 해제")
                break

            # 바이너리 지원 (레거시)
            if "bytes" in message and message["bytes"]:
                await gemini_session.send_realtime_input(
                    audio={"data": message["bytes"], "mime_type": "audio/pcm"}
                )

            # 텍스트 JSON payload
            elif "text" in message and message["text"]:
                try:
                    msg = json.loads(message["text"])
                    msg_type = msg.get("type", "")

                    if msg_type == "end":
                        print(f"[{session_id}] 클라이언트 세션 종료 요청")
                        break

                    elif msg_type == "audio":
                        # Base64 string from React ScriptProcessor
                        audio_b64 = msg.get("data", "")
                        if audio_b64:
                            audio_bytes = base64.b64decode(audio_b64)
                            await gemini_session.send_realtime_input(
                                audio={"data": audio_bytes, "mime_type": "audio/pcm"}
                            )
                            
                    elif msg_type == "end_turn":
                        # The user manually stopped the mic, so compel the AI to start speaking
                        print(f"[{session_id}] [Stop] 클라이언트 마이크 중지. 턴 종료 전송.")
                        await gemini_session.send_client_content(turn_complete=True)

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
        print(f"[{session_id}] [Warning] 클라이언트->Gemini 포워딩 오류: {e}")


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

                # 2) Tool Call → 실행 → tool_response 전송
                elif response.tool_call:
                    await _handle_tool_calls(
                        session_id, gemini_session, websocket,
                        response.tool_call, rag_keys,
                    )

                # 3) 서버 컨텐츠 (트랜스크립트, 턴 완료)
                elif response.server_content:
                    sc = response.server_content

                    # 사용자 음성 자막 (input_audio_transcription)
                    if hasattr(sc, "input_transcription") and sc.input_transcription:
                        text = getattr(sc.input_transcription, "text", None)
                        if text and text.strip():
                            _append_transcript(session, "user", text)
                            await websocket.send_json({
                                "type": "input_transcript",
                                "text": text,
                            })

                    # AI 음성 자막 (output_audio_transcription)
                    if hasattr(sc, "output_transcription") and sc.output_transcription:
                        text = getattr(sc.output_transcription, "text", None)
                        if text and text.strip():
                            _append_transcript(session, "ai", text)
                            await websocket.send_json({
                                "type": "output_transcript",
                                "text": text,
                            })

                    # model_turn 텍스트는 Extended Thinking 내부 추론이라 표시 안 함
                    # (WARNING: non-data parts ['thought','text'] 원인)
                    # _append_transcript 에만 남기고 프론트에는 보내지 않음
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if hasattr(part, "text") and part.text:
                                _append_transcript(session, "ai_thought", part.text)

                    if sc.turn_complete:
                        await websocket.send_json({"type": "turn_complete"})

    except asyncio.CancelledError:
        raise
    except Exception as e:
        err_msg = str(e)
        print(f"[{session_id}] [Warning] Gemini->클라이언트 포워딩 오류: {err_msg}")
        try:
            await websocket.send_json({
                "type": "session_end",
                "reason": "gemini_error",
                "message": f"Gemini 연결 오류로 세션이 종료되었습니다: {err_msg}"
            })
        except Exception:
            pass


async def _handle_tool_calls(
    session_id: str,
    gemini_session,
    websocket,
    tool_call,
    rag_keys: Optional[List[str]] = None,
) -> None:
    """Gemini의 tool_call을 처리하고 결과를 돌려보냄"""
    function_responses = []
    loop = asyncio.get_running_loop()

    for fc in tool_call.function_calls:
        print(f"[{session_id}] [Tool] Tool Call: {fc.name}({fc.args})")

        await websocket.send_json({
            "type": "tool_call_start",
            "message": _tool_start_message(fc.name),
            "data": {"tool": fc.name, "args": dict(fc.args)},
        })

        # ── 도구별 실행 ──
        if fc.name == "search_db":
            query = fc.args.get("query", "")
            result_text = await loop.run_in_executor(
                None, execute_search_db, query, rag_keys,
            )

        elif fc.name == "add_missing_point":
            point = fc.args.get("point", "")
            result_text = execute_add_missing_point(session_id, point)

            # 프론트엔드에 Missing 목록 변경 알림
            session = live_sessions.get(session_id)
            if session:
                await websocket.send_json({
                    "type": "missing_update",
                    "data": {
                        "missing_points":   session.get("missing_points", []),
                        "completed_points": [e["point"] for e in session.get("completed_points", [])],
                    },
                })

        elif fc.name == "mark_completed":
            point        = fc.args.get("point", "")
            how_resolved = fc.args.get("how_resolved", "")
            result_text = execute_mark_completed(session_id, point, how_resolved)

            # 프론트엔드에 Completed 목록 변경 알림
            session = live_sessions.get(session_id)
            if session:
                await websocket.send_json({
                    "type": "completed_update",
                    "data": {
                        "missing_points":   session.get("missing_points", []),
                        "completed_points": [e["point"] for e in session.get("completed_points", [])],
                    },
                })

        else:
            result_text = f"알 수 없는 도구: {fc.name}"

        function_responses.append(types.FunctionResponse(
            id=fc.id,
            name=fc.name,
            response={"result": result_text},
        ))

        await websocket.send_json({
            "type": "tool_call_end",
            "message": _tool_end_message(fc.name),
            "data": {"tool": fc.name},
        })

    await gemini_session.send_tool_response(function_responses=function_responses)
    print(f"[{session_id}] [OK] Tool Response 전송 완료 ({len(function_responses)}개)")


def _tool_start_message(tool_name: str) -> str:
    return {
        "search_db":         "학습 자료 검색 중...",
        "add_missing_point": "누락 포인트 기록 중...",
        "mark_completed":    "완료 항목 처리 중...",
    }.get(tool_name, f"도구 실행 중: {tool_name}")


def _tool_end_message(tool_name: str) -> str:
    return {
        "search_db":         "검색 완료. 응답 생성 중...",
        "add_missing_point": "Missing.md 업데이트됨.",
        "mark_completed":    "Completed.md 업데이트됨.",
    }.get(tool_name, f"도구 완료: {tool_name}")
