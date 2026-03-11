"""
Gemini Live Q&A Service Module
- Manage Gemini Live API (WebSocket) sessions
- Integrate ChromaDB RAG search (Function Calling)
- Track Missing / Completed points (add_missing_point / mark_completed)
- Process real-time audio streaming
- Store transcripts
"""

import os
import time
import asyncio
import json
import re
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
            model="gemini-3-flash-preview",
            contents=prompt
        )
        print("[Gemini] Response:", response.text)
        lines = response.text.strip().split("\n")
        goals = [line.strip("- *0123456789. ") for line in lines if line.strip()]
        return goals[:5]
    except Exception as e:
        print(f"Goal generation err: {e}")
        return []

# ====== Configuration ======

GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL",
    "gemini-2.5-flash-native-audio-preview-12-2025",
)
RAG_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))

# Audio settings
SEND_SAMPLE_RATE    = 16000   # Input: 16kHz 16-bit PCM mono
RECEIVE_SAMPLE_RATE = 24000   # Output: 24kHz 16-bit PCM mono

# Base path for Missing / Completed files
SESSIONS_DIR = Path(__file__).parent.parent.parent / "sessions"

# ====== Session Storage (in-memory) ======
live_sessions: Dict[str, Dict[str, Any]] = {}

# ====== VectorDB Instance (Shared) ======
_vector_db: Optional[VectorDBManager] = None

def get_vector_db() -> VectorDBManager:
    """Return VectorDBManager singleton instance"""
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDBManager()
    return _vector_db


# ====== Tool Declarations ======

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
        "Registers concepts or points that the student missed or explained insufficiently in their answer to the Missing list. "
        "Call this tool for every part you judge to be lacking after evaluating the student's answer. "
        "IMPORTANT: Never register items that are already in the Missing list or are very similar. "
        "If the student lacked so much fundamental knowledge that the AI had to directly explain a concept, "
        "resolve the difficult existing item by putting it on hold using mark_completed, and instead use this tool to "
        "add a new learning goal (Missing item) with more detailed and fundamental content."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "point": {
                "type": "string",
                "description": "Write the missed concept or insufficiently explained point concisely in one sentence. Example: 'Did not mention the push/pop time complexity of a stack'",
            },
        },
        "required": ["point"],
    },
}

MARK_COMPLETED_DECLARATION = {
    "name": "mark_completed",
    "description": (
        "Call when an item in the Missing list is resolved. "
        "Use this when the student has successfully explained the concept or when the AI tutor has completely explained it directly. "
        "The item will be removed from the Missing list and moved to the Completed list."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "point": {
                "type": "string",
                "description": "The completed item. Use exactly the same text as registered in the Missing list.",
            },
            "how_resolved": {
                "type": "string",
                "description": "A brief explanation of how it was resolved. Example: 'The student explained it correctly' or 'The AI directly explained it'",
            },
        },
        "required": ["point", "how_resolved"],
    },
}


# ====== MD File Management ======

def get_session_dir(session_id: str) -> Path:
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def save_md_files(session_id: str) -> None:
    """Save Missing.md and Completed.md to disk"""
    session = live_sessions.get(session_id)
    if not session:
        return

    session_dir = get_session_dir(session_id)
    missing_points    = session.get("missing_points", [])
    completed_points  = session.get("completed_points", [])

    # Missing.md
    missing_lines = ["# Missing Points\n",
                     "_Items the student either missed or insufficiently explained_\n\n"]
    if missing_points:
        for p in missing_points:
            missing_lines.append(f"- [ ] {p}\n")
    else:
        missing_lines.append("_(None)_\n")

    (session_dir / "Missing.md").write_text(
        "".join(missing_lines), encoding="utf-8"
    )

    # Completed.md
    completed_lines = ["# Completed Points\n",
                       "_Items resolved by the student or explained by the AI_\n\n"]
    if completed_points:
        for entry in completed_points:
            point        = entry.get("point", "")
            how_resolved = entry.get("how_resolved", "")
            completed_lines.append(f"- [x] {point}")
            if how_resolved:
                completed_lines.append(f"  _(→ {how_resolved})_")
            completed_lines.append("\n")
    else:
        completed_lines.append("_(None)_\n")

    (session_dir / "Completed.md").write_text(
        "".join(completed_lines), encoding="utf-8"
    )

    print(f"[{session_id}] Markdown files saved "
          f"(missing={len(missing_points)}, completed={len(completed_points)})")


# ====== Tool Execution Functions ======

def execute_search_db(query: str, keys: Optional[List[str]] = None) -> str:
    """
    Perform hybrid search in ChromaDB.
    Used as response to Gemini Live's tool_call.
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
            return "No search results found."

        chunks = []
        for r in results:
            text = r.get("content", "")
            source = r.get("metadata", {}).get("source", "")
            if text:
                header = f"[Source: {source}]" if source else ""
                chunks.append(f"{header}\n{text}" if header else text)

        result_text = "\n\n---\n\n".join(chunks)
        print(f"[Search] [search_db] query='{query}' | results={len(results)} | length={len(result_text)}")
        return result_text

    except Exception as e:
        print(f"[Warning] [search_db] Search failed: {e}")
        return f"Error during search: {str(e)}"


async def _is_duplicate_point(point: str, existing_points: List[str]) -> bool:
    """
    Checks if the new point is semantically duplicated with
    the existing list using gemini-3.1-flash-lite-preview.
    Returns False on API error to allow addition.
    """
    if not existing_points:
        return False

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return False

    existing_text = "\n".join(f"- {p}" for p in existing_points)
    prompt = (
        "You are an expert in detecting duplicate learning points.\n"
        "Determine if the 'New Point' below represents the exact same or highly similar core concept "
        "as any item in the 'Existing List'. If the core concept is the same, even if worded differently, it is a duplicate.\n\n"
        f"[New Point]\n{point}\n\n"
        f"[Existing List]\n{existing_text}\n\n"
        "If it is a duplicate, answer 'YES'. If not, answer 'NO'. Do not say anything else."
    )

    try:
        aio_client = genai.Client(api_key=api_key)
        response = await aio_client.aio.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=prompt,
        )
        answer = response.text.strip().upper()
        print(f"[DuplicateCheck] '{point[:40]}...' → {answer}")
        return answer.startswith("YES")
    except Exception as e:
        print(f"[Warning] [DuplicateCheck] Check failed, allowing addition: {e}")
        return False


async def execute_add_missing_point(session_id: str, point: str) -> str:
    """Add point to Missing list (including semantic duplicate check)"""
    session = live_sessions.get(session_id)
    if not session:
        return "Session not found."

    missing   = session.setdefault("missing_points", [])
    completed = session.setdefault("completed_points", [])

    # 1) Prevent exact string duplication
    if point in missing:
        return f"Already in the Missing list: {point}"

    # 2) Check if it's already in the Completed list
    completed_texts = [e.get("point", "") for e in completed]
    if point in completed_texts:
        return f"Already in the Completed list: {point}"

    # 3) Semantic duplication check (gemini-3.1-flash-lite-preview)
    all_existing = missing + completed_texts
    is_dup = await _is_duplicate_point(point, all_existing)
    if is_dup:
        print(f"[{session_id}] ⚠️  Rejected due to semantic duplication: {point}")
        return f"A semantically similar item already exists (Addition rejected): '{point}'"

    missing.append(point)
    save_md_files(session_id)

    print(f"[{session_id}] ➕ Missing added: {point}")
    return f"Added to Missing list: '{point}' (Currently {len(missing)} items)"


def execute_mark_completed(session_id: str, point: str, how_resolved: str) -> str:
    """Move Missing → Completed"""
    session = live_sessions.get(session_id)
    if not session:
        return "Session not found."

    missing    = session.setdefault("missing_points", [])
    completed  = session.setdefault("completed_points", [])

    if point not in missing:
        # Append to Completed even if not in Missing list (flexibility)
        print(f"[{session_id}] [Warning] mark_completed: Item not in Missing list: {point}")
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


# ====== Session Management ======

def create_live_session(
    student_info: Dict[str, Any],
    exam_info: Dict[str, Any],
    rag_keys: Optional[List[str]] = None,
    system_prompt_override: Optional[str] = None,
    study_goals: Optional[List[str]] = None,
) -> str:
    """Create Live session and return session_id"""
    session_id = str(uuid4())

    live_sessions[session_id] = {
        "student_info": student_info,
        "exam_info": exam_info,
        "rag_keys": rag_keys,
        "system_prompt": (f"{LIVE_TUTOR_SYSTEM_PROMPT}\n\n{system_prompt_override}") if system_prompt_override else LIVE_TUTOR_SYSTEM_PROMPT,
        "status": SessionStatus.PENDING,
        "transcript": [],           # List[TranscriptEntry]
        "missing_points": study_goals or [],       # Set goals immediately
        "completed_points": [],     # List[Dict] {point, how_resolved, timestamp}
        "created_at": time.time(),
        "ended_at": None,
        "active": True,
        "gemini_session": None,
    }

    # Create initial empty MD files
    save_md_files(session_id)

    print(f"[{session_id}] [Live] Live session created (status=pending)")
    return session_id


def get_live_session(session_id: str) -> Optional[Dict[str, Any]]:
    return live_sessions.get(session_id)


def delete_live_session(session_id: str):
    session = live_sessions.pop(session_id, None)
    if session:
        print(f"[{session_id}] [Cleanup] Live session deleted")


def _append_transcript(session: Dict[str, Any], role: str, text: str):
    """Append entry to transcript"""
    if text and text.strip():
        entry = TranscriptEntry(role=role, text=text.strip(), timestamp=time.time())
        session["transcript"].append(entry)


def build_live_config(session: Dict[str, Any]) -> dict:
    """Build Gemini Live API connection configuration"""
    system_prompt = session["system_prompt"]

    exam_content      = session["exam_info"].get("content", "")
    exam_name         = session["exam_info"].get("name", "")
    first_question    = session["exam_info"].get("first_question", "")

    if exam_content or exam_name:
        system_prompt += (
            f"\n\n## Exam Information\n"
            f"- Exam Name: {exam_name}\n"
            f"- Scope/Guide:\n{exam_content}"
        )

    if first_question:
        system_prompt += (
            f"\n\n## First Question (System Provided)\n"
            f"When the session starts, please verbally ask the student the following question:\n"
            f"\"{first_question}\""
        )

    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": system_prompt,
        # Enable user audio transcription + AI audio transcription
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


# ====== Session Main Loop ======

async def handle_live_session(session_id: str, websocket) -> None:
    """
    Main loop for Gemini Live session.
    Acts as a bridge between the frontend WebSocket and Gemini Live API.
    """
    session = live_sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found."})
        return

    rag_keys = session.get("rag_keys")
    config   = build_live_config(session)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY is not set."})
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

    # Status: pending → active
    session["status"] = SessionStatus.ACTIVE

    try:
        is_first_connection = True
        while session.get("active", True):
            try:
                async with client.aio.live.connect(
                    model=GEMINI_LIVE_MODEL,
                    config=config,
                ) as gemini_session:
                    session["gemini_session"] = gemini_session

                    if is_first_connection:
                        await websocket.send_json({
                            "type": "ready",
                            "message": "Gemini Live connected. You can start audio streaming.",
                            "data": {
                                "send_sample_rate":    SEND_SAMPLE_RATE,
                                "receive_sample_rate": RECEIVE_SAMPLE_RATE,
                            },
                        })
                        print(f"[{session_id}] [OK] Gemini Live connected (status=active)")

                        # Inject first question from system
                        first_question = session["exam_info"].get("first_question", "")
                        if first_question:
                            await _inject_first_question(session_id, gemini_session, first_question)
                        else:
                            goals = session.get("missing_points", [])
                            if goals:
                                await _inject_dynamic_first_question(session_id, gemini_session, goals)
                            else:
                                await _inject_first_question(session_id, gemini_session, "Hello! What shall we talk about today?")
                        is_first_connection = False
                    else:
                        print(f"[{session_id}] [Reconnect] Attempting hot-reconnect to server due to frequent Gemini Live disconnections.")
                        
                        # 1. Load previous transcript (keep only latest 10 to avoid excessive length)
                        recent_history = session.get("transcript", [])[-10:]
                        history_text = "Previous conversation history:\n"
                        for entry in recent_history:
                            role_name = "Student" if "user" in entry.role else "AI Tutor"
                            history_text += f"{role_name}: {entry.text}\n"
                        
                        # 2. Send prompt to restore context upon reconnection
                        recovery_prompt = (
                            f"System instructions: The connection was briefly lost due to a network issue and has now been restored. "
                            f"The student is unaware of this interruption. Do NOT apologize or mention it under any circumstances.\n\n"
                            f"{history_text}\n"
                            f"Based on the conversation history above, maintain the context and respond naturally to the student's last input."
                        )
                        await gemini_session.send_client_content(
                            turns={"parts": [{"text": recovery_prompt}]},
                            turn_complete=True,
                        )
                        print(f"[{session_id}] [Reconnect] Successfully injected previous conversation history to Gemini.")

                    async with asyncio.TaskGroup() as tg:
                        tg.create_task(_forward_client_to_gemini(session_id, websocket, gemini_session, session))
                        tg.create_task(_forward_gemini_to_client(session_id, websocket, gemini_session, rag_keys, session))

            except asyncio.CancelledError:
                raise
            except Exception as e:
                err_msg = str(e)
                print(f"[{session_id}] [Error] Gemini Live error or disconnected: {err_msg}")
                if not session.get("active", True):
                    break
                # Attempt reconnection upon abnormal termination (after 1 second delay)
                print(f"[{session_id}] [Reconnect] Attempting reconnect in 1 second...")
                await asyncio.sleep(1)

    except asyncio.CancelledError:
        print(f"[{session_id}] Session cancelled")
        try:
            await websocket.send_json({"type": "session_end", "reason": "cancelled", "message": "Session was cancelled."})
        except Exception:
            pass
    finally:
        _finish_session(session_id)
        try:
            await websocket.send_json({"type": "session_end", "reason": "finished", "message": "The session has ended."})
        except Exception:
            pass
        print(f"[{session_id}] [Closed] Gemini Live connection and loop completely terminated")


def _finish_session(session_id: str):
    """Handle session termination"""
    session = live_sessions.get(session_id)
    if session:
        session["status"]       = SessionStatus.COMPLETED
        session["active"]       = False
        session["ended_at"]     = time.time()
        session["gemini_session"] = None
        # Save final MD files
        save_md_files(session_id)


# ====== Inject First Question ======

async def _inject_first_question(
    session_id: str,
    gemini_session,
    first_question: str,
) -> None:
    """
    System injects the first question into Gemini when the session starts.
    Gemini receives this text and asks the student verbally.
    """
    instruction = (
        f"Right now, please verbally ask the student the following question. "
        f"Do not say anything else besides this question:\n\n\"{first_question}\""
    )
    try:
        await gemini_session.send_client_content(
            turns={"parts": [{"text": instruction}]},
            turn_complete=True,
        )
        print(f"[{session_id}] [Msg] First question injected: {first_question[:50]}...")
    except Exception as e:
        print(f"[{session_id}] [Warning] Failed to inject first question: {e}")


async def _inject_dynamic_first_question(
    session_id: str,
    gemini_session,
    goals: List[str],
) -> None:
    """
    System injects dynamic first question instructions into Gemini 
    based on learning goals when the session starts.
    """
    goals_text = "\n".join([f"- {g}" for g in goals])
    instruction = (
        f"Greet the student, and ask an engaging and natural first question to make them think about one of the following learning goals. "
        f"NEVER use stiff or generic openings like 'Let's start learning based on this document' or 'What should we start with?'. "
        f"Instead, immediately toss a specific concept related to a goal as a conversation starter.\n\n"
        f"[Learning Goals]\n{goals_text}"
    )
    try:
        await gemini_session.send_client_content(
            turns={"parts": [{"text": instruction}]},
            turn_complete=True,
        )
        print(f"[{session_id}] [Msg] Dynamic first question injected")
    except Exception as e:
        print(f"[{session_id}] [Warning] Failed to inject dynamic first question: {e}")


# ====== Internal Tasks ======

async def _forward_client_to_gemini(
    session_id: str,
    websocket,
    gemini_session,
    session: Dict[str, Any],
) -> None:
    """Client → Gemini: Forward audio binaries & text messages"""
    import base64
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                print(f"[{session_id}] Client disconnected")
                break

            # Binary support (Legacy)
            if "bytes" in message and message["bytes"]:
                await gemini_session.send_realtime_input(
                    audio={"data": message["bytes"], "mime_type": "audio/pcm;rate=16000"}
                )

            # Text JSON payload
            elif "text" in message and message["text"]:
                try:
                    msg = json.loads(message["text"])
                    msg_type = msg.get("type", "")

                    if msg_type == "end":
                        print(f"[{session_id}] Client requested session end")
                        session["active"] = False
                        raise asyncio.CancelledError("Client ended session")

                    elif msg_type == "audio":
                        # Base64 string from React ScriptProcessor
                        audio_b64 = msg.get("data", "")
                        if audio_b64:
                            audio_bytes = base64.b64decode(audio_b64)
                            await gemini_session.send_realtime_input(
                                audio={"data": audio_bytes, "mime_type": "audio/pcm;rate=16000"}
                            )
                            
                    elif msg_type == "end_turn":
                        # The user manually stopped the mic, so compel the AI to start speaking
                        print(f"[{session_id}] [Stop] Client microphone stopped. Sending turn_complete.")
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

    except asyncio.CancelledError:
        raise
    except Exception as e:
        print(f"[{session_id}] [Warning] Client->Gemini forwarding error: {e}")
        session["active"] = False
        raise asyncio.CancelledError("Client websocket issue")


async def _forward_gemini_to_client(
    session_id: str,
    websocket,
    gemini_session,
    rag_keys: Optional[List[str]],
    session: Dict[str, Any],
) -> None:
    """Gemini → Client: Forward audio responses & process tool_calls"""
    try:
        while True:
            turn = gemini_session.receive()
            async for response in turn:

                # 1) Audio → send binary to client
                if response.data is not None:
                    await websocket.send_bytes(response.data)

                # 2) Tool Call → Execute → send tool_response
                elif response.tool_call:
                    await _handle_tool_calls(
                        session_id, gemini_session, websocket,
                        response.tool_call, rag_keys,
                    )

                # 3) Server Content (transcript, turn complete)
                elif response.server_content:
                    sc = response.server_content

                    # User voice transcription (input_audio_transcription)
                    if hasattr(sc, "input_transcription") and sc.input_transcription:
                        text = getattr(sc.input_transcription, "text", None)
                        if text and text.strip():
                            _append_transcript(session, "user", text)
                            await websocket.send_json({
                                "type": "input_transcript",
                                "text": text,
                            })

                    # AI voice transcription (output_audio_transcription)
                    if hasattr(sc, "output_transcription") and sc.output_transcription:
                        text = getattr(sc.output_transcription, "text", None)
                        if text:
                            # Filtering: Remove control tokens and tool names from speech
                            text = re.sub(r'<ctrl\d+>', '', text)
                            text = text.replace('search_db()', '').replace('search_db', '')
                            text = text.replace('add_missing_point()', '').replace('add_missing_point', '')
                            text = text.replace('mark_completed()', '').replace('mark_completed', '')
                            text = text.strip()
                        if text:
                            _append_transcript(session, "ai", text)
                            await websocket.send_json({
                                "type": "output_transcript",
                                "text": text,
                            })

                    # The model_turn text is internal reasoning for Extended Thinking, so do not display it
                    # (WARNING: CAUSES non-data parts ['thought','text'])
                    # Leave it ONLY in _append_transcript and do not send it to the frontend
                    if sc.model_turn:
                        for part in sc.model_turn.parts:
                            if hasattr(part, "text") and part.text:
                                _append_transcript(session, "ai_thought", part.text)

                    if sc.turn_complete:
                        await websocket.send_json({"type": "turn_complete"})
                    
                    if getattr(sc, "interrupted", False):
                        print(f"[{session_id}] [Interrupt] Gemini Live interrupted by user speech")
                        await websocket.send_json({"type": "interrupted"})

    except asyncio.CancelledError:
        raise
    except Exception as e:
        err_msg = str(e)
        print(f"[{session_id}] [Warning] Gemini->Client forwarding error: {err_msg}")
        # Throw the error so TaskGroup cancels it and proceeds to the reconnect loop.
        # Do not send client disconnection packets upon abnormal termination
        raise e


async def _handle_tool_calls(
    session_id: str,
    gemini_session,
    websocket,
    tool_call,
    rag_keys: Optional[List[str]] = None,
) -> None:
    """Process Gemini's tool_call and send response back"""
    function_responses = []
    loop = asyncio.get_running_loop()

    for fc in tool_call.function_calls:
        print(f"[{session_id}] [Tool] Tool Call: {fc.name}({fc.args})")

        await websocket.send_json({
            "type": "tool_call_start",
            "message": _tool_start_message(fc.name),
            "data": {"tool": fc.name, "args": dict(fc.args)},
        })

        # ── Tool-specific execution ──
        if fc.name == "search_db":
            query = fc.args.get("query", "")
            result_text = await loop.run_in_executor(
                None, execute_search_db, query, rag_keys,
            )

        elif fc.name == "add_missing_point":
            point = fc.args.get("point", "")
            result_text = await execute_add_missing_point(session_id, point)

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

                # 모든 학습 목표 달성 시 → Gemini가 마무리 멘트 후 세션 종료
                if not session.get("missing_points"):
                    print(f"[{session_id}] 🎉 모든 학습 목표 달성 — 세션 종료 예약")
                    try:
                        await gemini_session.send_client_content(
                            turns={"parts": [{"text": (
                                "모든 학습 목표가 완료되었습니다. "
                                "학생에게 '모든 내용을 학습하셨네요! 오늘 수고하셨습니다.' 라고 "
                                "따뜻하게 마무리 인사를 해주세요. 그 이상의 질문은 하지 마세요."
                            )}]},
                            turn_complete=True,
                        )
                    except Exception as e:
                        print(f"[{session_id}] [Warning] 마무리 멘트 주입 실패: {e}")
                    session["active"] = False

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
