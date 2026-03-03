"""
튜터 모드 서비스

기존 Question 서비스의 핵심 로직(RAG 검색, Missing Point 분석, 소크라틱 질문)을 활용하여
AI가 먼저 설명하고 → 이해 확인 → 보충 설명하는 튜터 흐름을 구현합니다.

흐름:
  1. POST /api/tutor/start   → AI가 주제 설명 + 첫 질문 반환
  2. POST /api/tutor/reply   → 학생 답변 → Missing Point 분석 → 피드백+보충+다음질문 반환
  3. POST /api/tutor/end     → 세션 요약 반환
"""

import json
import time
import asyncio
from uuid import uuid4
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

from common.config import EXECUTOR_WORKERS, EXECUTOR_SEM, DUPLICATE_THRESHOLD
from common.ai_client import ai_call, parse_json_response
from apis.tutor.prompts import TUTOR_EXPLAIN_PROMPT, TUTOR_GUIDE_PROMPT, TUTOR_SUMMARY_PROMPT

# 기존 question 서비스에서 공통 유틸 재활용
from apis.question.service import (
    filter_chunks_async,
    missing_points_async,
    prioritize_missing_points,
    is_question_duplicate,
    format_qa_history,
    run_blocking,
)

# ──────────────────────────────────────────────────────────────────────────────
# 세션 저장소 (in-memory)
# ──────────────────────────────────────────────────────────────────────────────
tutor_sessions: Dict[str, Dict[str, Any]] = {}


# ──────────────────────────────────────────────────────────────────────────────
# AI 호출 헬퍼
# ──────────────────────────────────────────────────────────────────────────────

def _call_explain(topic: str, chunk_str: str) -> Dict[str, Any]:
    """주제 설명 + 첫 질문 생성"""
    user_block = f"TOPIC:\n{topic}\n\nDOCUMENT:\n{chunk_str}"
    messages = [
        {"role": "system", "content": TUTOR_EXPLAIN_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if not response:
        return {
            "explanation": f"'{topic}'에 대해 학습을 시작합니다.",
            "key_concepts": [topic],
            "first_question": f"{topic}에 대해 알고 있는 것을 설명해 보세요.",
        }
    parsed = parse_json_response(response)
    if not isinstance(parsed, dict) or "explanation" not in parsed:
        return {
            "explanation": response[:500],
            "key_concepts": [topic],
            "first_question": f"{topic}의 핵심 개념을 설명해 보세요.",
        }
    return parsed


def _call_guide(
    history_str: str,
    chunk_str: str,
    missing_point: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """피드백 + 보충 설명 + 다음 질문 생성"""
    mp_str = json.dumps(missing_point, ensure_ascii=False) if missing_point else "(none)"
    user_block = (
        f"DOCUMENT:\n{chunk_str}\n\n"
        f"QA_HISTORY:\n{history_str}\n\n"
        f"MISSING_POINT:\n{mp_str}"
    )
    messages = [
        {"role": "system", "content": TUTOR_GUIDE_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if not response:
        return {
            "feedback": "잘 생각해 보셨네요!",
            "supplement": "",
            "next_question": None,
            "is_complete": True,
        }
    parsed = parse_json_response(response)
    if not isinstance(parsed, dict) or "feedback" not in parsed:
        return {
            "feedback": response[:200],
            "supplement": "",
            "next_question": None,
            "is_complete": True,
        }
    return parsed


def _call_summary(history_str: str, chunk_str: str) -> Dict[str, Any]:
    """세션 학습 요약 생성"""
    user_block = f"DOCUMENT:\n{chunk_str}\n\nQA_HISTORY:\n{history_str}"
    messages = [
        {"role": "system", "content": TUTOR_SUMMARY_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if not response:
        return {"summary": "학습이 완료되었습니다.", "strengths": [], "areas_to_review": []}
    parsed = parse_json_response(response)
    if not isinstance(parsed, dict) or "summary" not in parsed:
        return {"summary": response[:300], "strengths": [], "areas_to_review": []}
    return parsed


async def _call_explain_async(topic: str, chunk_str: str) -> Dict[str, Any]:
    return await run_blocking(_call_explain, topic, chunk_str)

async def _call_guide_async(
    history_str: str, chunk_str: str, missing_point: Optional[Dict]
) -> Dict[str, Any]:
    return await run_blocking(_call_guide, history_str, chunk_str, missing_point)

async def _call_summary_async(history_str: str, chunk_str: str) -> Dict[str, Any]:
    return await run_blocking(_call_summary, history_str, chunk_str)


# ──────────────────────────────────────────────────────────────────────────────
# 튜터 세션 관리
# ──────────────────────────────────────────────────────────────────────────────

def create_tutor_session() -> str:
    session_id = str(uuid4())
    tutor_sessions[session_id] = {
        "topic": "",
        "rag_keys": None,
        "history": [],          # [(question, student_answer), ...]
        "chunk_str_cache": "",  # 마지막 검색 결과 캐시
        "covered_concepts": [], # 이미 다룬 개념들
        "turn": 0,
        "active": True,
        "created_at": time.time(),
    }
    return session_id


def get_tutor_session(session_id: str) -> Optional[Dict[str, Any]]:
    return tutor_sessions.get(session_id)


def delete_tutor_session(session_id: str):
    tutor_sessions.pop(session_id, None)


# ──────────────────────────────────────────────────────────────────────────────
# 핵심 비즈니스 로직
# ──────────────────────────────────────────────────────────────────────────────

async def tutor_start(
    session_id: str,
    topic: str,
    rag_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    튜터 세션 시작:
    1. RAG로 주제 관련 문서 검색
    2. AI가 개념 설명 + 첫 질문 생성
    """
    session = tutor_sessions[session_id]
    session["topic"] = topic
    session["rag_keys"] = rag_keys

    # RAG 검색
    chunk_str = await filter_chunks_async(query=topic, rag_keys=rag_keys)
    session["chunk_str_cache"] = chunk_str

    # 설명 + 첫 질문 생성
    result = await _call_explain_async(topic, chunk_str)

    explanation = result.get("explanation", "")
    key_concepts = result.get("key_concepts", [])
    first_question = result.get("first_question", f"{topic}에 대해 설명해 보세요.")

    session["covered_concepts"] = key_concepts
    session["turn"] = 1

    print(f"[{session_id}] 튜터 시작 - 주제: {topic} | 첫 질문: {first_question[:60]}...")

    return {
        "session_id": session_id,
        "type": "explain",
        "explanation": explanation,
        "key_concepts": key_concepts,
        "question": first_question,
        "turn": 1,
    }


async def tutor_reply(session_id: str, student_answer: str) -> Dict[str, Any]:
    """
    학생 답변 처리:
    1. 현재 질문 + 답변을 히스토리에 추가
    2. RAG 재검색 (답변 기반으로 정확도 향상)
    3. Missing Point 분석 (기존 question 서비스 그대로 재활용)
    4. 피드백 + 보충 설명 + 다음 질문 생성
    """
    session = get_tutor_session(session_id)
    if not session:
        return {"error": "세션을 찾을 수 없습니다."}
    if not session["active"]:
        return {"error": "이미 종료된 세션입니다."}

    rag_keys = session.get("rag_keys")

    # 현재 질문 (히스토리의 마지막 question 또는 세션 topic)
    current_question = (
        session["history"][-1][0] if session["history"] else session["topic"]
    )

    # 히스토리에 추가
    session["history"].append((current_question, student_answer))
    history_str = format_qa_history(session["history"])

    # 답변 기반 RAG 재검색
    search_query = f"{current_question} {student_answer}"
    chunk_str = await filter_chunks_async(query=search_query, rag_keys=rag_keys)
    session["chunk_str_cache"] = chunk_str

    # Missing Point 분석 (기존 로직 그대로)
    missing_list = await missing_points_async(history_str, chunk_str)
    sorted_missing = prioritize_missing_points(missing_list)
    top_missing = sorted_missing[0] if sorted_missing else None

    print(f"[{session_id}] Missing Point: {len(sorted_missing)}개 | Top: {top_missing}")

    # 피드백 + 보충 + 다음 질문
    guide = await _call_guide_async(history_str, chunk_str, top_missing)

    feedback = guide.get("feedback", "")
    supplement = guide.get("supplement", "")
    next_question = guide.get("next_question")
    is_complete = guide.get("is_complete", False)

    # 중복 질문 검사
    if next_question and is_question_duplicate(next_question, session["history"]):
        print(f"[{session_id}] 중복 질문 감지 → 완료 처리")
        next_question = None
        is_complete = True

    session["turn"] += 1

    if is_complete or not next_question:
        session["active"] = False
        print(f"[{session_id}] 튜터 세션 완료 (turn {session['turn']})")
        return {
            "session_id": session_id,
            "type": "complete",
            "feedback": feedback,
            "supplement": supplement,
            "question": None,
            "is_complete": True,
            "turn": session["turn"],
        }

    print(f"[{session_id}] 다음 질문: {next_question[:60]}...")
    return {
        "session_id": session_id,
        "type": "guide",
        "feedback": feedback,
        "supplement": supplement,
        "question": next_question,
        "is_complete": False,
        "turn": session["turn"],
    }


async def tutor_end(session_id: str) -> Dict[str, Any]:
    """
    세션 강제 종료 + 학습 요약 생성
    """
    session = get_tutor_session(session_id)
    if not session:
        return {"error": "세션을 찾을 수 없습니다."}

    history_str = format_qa_history(session["history"])
    chunk_str = session["chunk_str_cache"]

    # 요약 생성
    if session["history"]:
        summary_data = await _call_summary_async(history_str, chunk_str)
    else:
        summary_data = {
            "summary": "학습이 시작되었으나 답변이 없어 요약을 생성할 수 없습니다.",
            "strengths": [],
            "areas_to_review": [],
        }

    session["active"] = False
    delete_tutor_session(session_id)

    return {
        "session_id": session_id,
        "type": "summary",
        "summary": summary_data.get("summary", ""),
        "strengths": summary_data.get("strengths", []),
        "areas_to_review": summary_data.get("areas_to_review", []),
        "total_turns": session["turn"],
    }
