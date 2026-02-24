"""
문제 출제 서비스 모듈
server_1213.py의 핵심 로직을 REST API용으로 재구성
- 세션 관리 (in-memory)
- Missing Point 생성
- 후속 질문 생성
- RAG 통합 검색
"""

import os
import re
import json
import time
import asyncio
import httpx
from uuid import uuid4
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from common.config import (
    CHUNK_PATH, TREE_PATH, TOP_K_CHUNK,
    EXECUTOR_WORKERS, EXECUTOR_SEM,
    DUPLICATE_THRESHOLD, KEYWORD_OVERLAP_THRESHOLD,
    MAX_QUESTION_RETRIES, SEARCH_MODE, HOST, PORT,
)
from common.ai_client import (
    ai_call, parse_json_response, prepare_attachments,
)
from apis.question.prompts import (
    MISSING_SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, BONUS_SYSTEM_PROMPT,
)
from apis.question.tree import (
    Node, create_initial_tree, reconstruct_tree,
    find_last_unanswered_node, find_latest_tree_file,
    save_tree_to_json,
)

# ====== 스레드 풀 설정 ======
executor = ThreadPoolExecutor(max_workers=EXECUTOR_WORKERS)
global_sem = asyncio.Semaphore(EXECUTOR_SEM)

# ====== 세션 저장소 (in-memory) ======
sessions: Dict[str, Dict[str, Any]] = {}


async def run_blocking(func, *args, **kwargs):
    """블로킹 함수를 스레드 풀에서 실행"""
    loop = asyncio.get_running_loop()
    async with global_sem:
        return await loop.run_in_executor(executor, lambda: func(*args, **kwargs))


# ====== 유틸리티 함수들 ======

def format_qa_history(history: List[List[str]]) -> str:
    if not history:
        return "(none)"
    return "\n\n".join(f"QUESTION: {q}\nSTUDENT_REPLY: {a}" for q, a in history)


def extract_key_terms(text: str, min_length: int = 3) -> set:
    stopwords = {
        "what", "how", "why", "when", "where", "which", "who",
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "can", "may", "might", "must",
        "this", "that", "these", "those", "it", "its",
        "you", "your", "we", "our", "they", "their",
        "about", "with", "from", "into", "for", "on", "in", "to", "of",
        "and", "or", "but", "if", "then", "else", "so", "because",
        "please", "explain", "describe", "tell", "me", "give", "provide",
    }
    words = re.findall(r"\b[a-zA-Z가-힣]+\b", text.lower())
    return {w for w in words if len(w) >= min_length and w not in stopwords}


def prioritize_missing_points(missing_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sanitized_list = []
    for mp in missing_list:
        if isinstance(mp, dict):
            sanitized_list.append(mp)
        elif isinstance(mp, str):
            print(f"⚠️ [prioritize_missing_points] String item detected, converting: {mp}")
            sanitized_list.append({
                "content": mp,
                "type": "missing",
                "description": "Auto-converted from string output"
            })
        else:
            print(f"⚠️ [prioritize_missing_points] Invalid item type: {type(mp)}")

    missing_type = [mp for mp in sanitized_list if mp.get("type") == "missing"]
    insufficient_type = [mp for mp in sanitized_list if mp.get("type") == "insufficient"]
    return missing_type + insufficient_type


# ====== 검색 함수들 ======

def load_dataset(chunk_path: str) -> List[Dict[str, Any]]:
    if not chunk_path or not os.path.exists(chunk_path):
        print(f"⚠️ 청크 경로 '{chunk_path}'가 존재하지 않습니다.")
        return []
    with open(chunk_path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def top_k_tfidf_dicts(
    chunks: List[Dict[str, Any]],
    query: str,
    k: int = 5,
    text_key: str = "chunk",
    max_features: Optional[int] = 50_000,
) -> List[Dict[str, Any]]:
    if not chunks or not query:
        return []
    indexed_texts = [(i, str(obj.get(text_key, "") or "").strip()) for i, obj in enumerate(chunks)]
    indexed_texts = [(i, t) for i, t in indexed_texts if t]
    if not indexed_texts:
        return []
    orig_indices, texts = zip(*indexed_texts)
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=max_features)
    X = vectorizer.fit_transform(list(texts) + [query])
    chunk_mat = X[:-1]
    query_vec = X[-1]
    sims = cosine_similarity(query_vec, chunk_mat)[0]
    k_eff = min(k, len(texts))
    top_local_idx = np.argpartition(-sims, kth=k_eff - 1)[:k_eff]
    top_local_idx = top_local_idx[np.argsort(-sims[top_local_idx])]
    return [
        {"index": int(orig_indices[li]), "score": float(sims[li]), **chunks[orig_indices[li]]}
        for li in top_local_idx
    ]


def filter_chunks_tfidf(chunks: List[Dict[str, Any]], query: str) -> str:
    """TF-IDF 기반 로컬 검색"""
    documents = top_k_tfidf_dicts(chunks, query, k=TOP_K_CHUNK, text_key="chunk")
    return "\n\n".join(doc["chunk"] for doc in documents)


async def filter_chunks_rag(query: str, keys: Optional[List[str]] = None, top_k: int = TOP_K_CHUNK) -> str:
    """RAG 시스템을 통한 하이브리드 검색 (내부 HTTP 호출)"""
    try:
        rag_url = f"http://127.0.0.1:{PORT}/api/rag/search"
        payload = {
            "query": query,
            "top_k": top_k,
            "use_reranker": True,
        }
        if keys:
            payload["keys"] = keys

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(rag_url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        if not results:
            return ""

        chunks = []
        for r in results:
            text = r.get("content", "")
            source = r.get("metadata", {}).get("source", "")
            if text:
                chunks.append(f"[출처: {source}]\n{text}" if source else text)

        chunk_str = "\n\n".join(chunks)
        print(f"🔥 [RAG 검색 결과] 길이: {len(chunk_str)} | 내용(일부): {chunk_str[:200]}...")
        return chunk_str

    except Exception as e:
        print(f"⚠️ RAG 검색 실패, 빈 결과 반환: {e}")
        return ""


async def filter_chunks_async(
    query: str,
    all_doc: List[Dict[str, Any]] = None,
    rag_keys: Optional[List[str]] = None,
) -> str:
    """검색 모드에 따라 적절한 검색 수행"""
    if SEARCH_MODE == "rag":
        return await filter_chunks_rag(query, keys=rag_keys)
    else:
        if all_doc is None:
            return ""
        return await run_blocking(filter_chunks_tfidf, all_doc, query)


# ====== 핵심 기능 함수들 ======

def missing_points(
    history_str: str, chunk_str: str, attachments: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    user_block = f"""DOCUMENT: 
{chunk_str} 

QA_HISTORY:
{history_str}

IMPORTANT:
Please evaluate ONLY the Student's LAST REPLY in the QA_HISTORY above against the DOCUMENT.
Identify missing points strictly based on the comparison between the LAST REPLY and the DOCUMENT.
"""
    messages = [
        {"role": "system", "content": MISSING_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if response is None:
        return []
    parsed = parse_json_response(response)
    print("[missing_point 어시스턴트]")
    print(parsed)
    return parsed or []


def make_question(
    history_str: str,
    missing_point: Dict[str, Any],
    chunk_str: str,
    attachments: Optional[List[str]] = None,
) -> Dict[str, Any]:
    print(f"[type] {missing_point.get('type')} | [content] {missing_point.get('content')}")
    missing_point_str = json.dumps(missing_point, ensure_ascii=False)
    user_block = f"DOCUMENT:\n{chunk_str}\n\nQA_HISTORY:\n{history_str}\n\nMISSING_POINT:\n{missing_point_str}"
    messages = [
        {"role": "system", "content": FOLLOWUP_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if response is None:
        return {"question": None, "model_answer": None}
    parsed = parse_json_response(response)
    print("[make_question 어시스턴트]")
    print(parsed)
    if not isinstance(parsed, dict) or "question" not in parsed or "model_answer" not in parsed:
        return {"question": None, "model_answer": None}
    return parsed


def make_bonus_question(history_str: str, chunk_str: str) -> List[Dict[str, str]]:
    user_block = f"DOCUMENT:\n{chunk_str}\n\nQA_HISTORY:\n{history_str}"
    messages = [
        {"role": "system", "content": BONUS_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    response = ai_call(messages)
    if response is None:
        return []
    parsed = parse_json_response(response)
    print("[make_bonus_question 어시스턴트]")
    print(parsed)
    return parsed or []


def is_question_duplicate(
    new_question: str,
    history: List[List[str]],
    threshold: float = DUPLICATE_THRESHOLD,
    keyword_overlap_threshold: float = KEYWORD_OVERLAP_THRESHOLD,
) -> bool:
    if not history or not new_question:
        return False
    previous_questions = [q for q, _ in history if q]
    if not previous_questions:
        return False
    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), lowercase=True, strip_accents="unicode")
        all_questions = previous_questions + [new_question]
        vectors = vectorizer.fit_transform(all_questions)
        new_q_vec = vectors[-1]
        prev_vecs = vectors[:-1]
        similarities = cosine_similarity(new_q_vec, prev_vecs)[0]
        max_similarity = np.max(similarities) if len(similarities) > 0 else 0

        new_terms = extract_key_terms(new_question)
        max_keyword_overlap = 0.0
        if new_terms:
            for prev_q in previous_questions:
                prev_terms = extract_key_terms(prev_q)
                if prev_terms:
                    overlap = len(new_terms & prev_terms) / min(len(new_terms), len(prev_terms))
                    max_keyword_overlap = max(max_keyword_overlap, overlap)

        is_tfidf_dup = max_similarity > threshold
        is_keyword_dup = max_keyword_overlap > keyword_overlap_threshold
        is_dup = is_tfidf_dup or is_keyword_dup

        if is_dup:
            most_similar_idx = np.argmax(similarities)
            print(f"⚠️ 중복 질문 감지 | TF-IDF: {max_similarity:.3f} | 키워드: {max_keyword_overlap:.3f}")
        return is_dup
    except Exception as e:
        print(f"⚠️ 중복 검사 오류: {e}")
        return False


# ====== 비동기 래퍼 ======

async def missing_points_async(history_str, chunk_str, attachments=None):
    return await run_blocking(missing_points, history_str, chunk_str, attachments)

async def make_question_async(history_str, missing_point, chunk_str, attachments=None):
    return await run_blocking(make_question, history_str, missing_point, chunk_str, attachments)

async def make_bonus_question_async(history_str, chunk_str):
    return await run_blocking(make_bonus_question, history_str, chunk_str)

async def prepare_attachments_async(urls):
    return await run_blocking(prepare_attachments, urls)


async def make_question_with_retry(
    history_str, missing_point, chunk_str, attachments=None, max_retries=MAX_QUESTION_RETRIES
):
    current_mp = missing_point.copy()
    for attempt in range(max_retries):
        follow_up = await make_question_async(history_str, current_mp, chunk_str, attachments)
        if follow_up.get("question") is not None:
            return follow_up
        if attempt < max_retries - 1:
            print(f"   질문 생성 재시도 ({attempt + 2}/{max_retries})...")
            current_mp = {
                **current_mp,
                "description": f"{current_mp.get('description', '')} (이 내용에 대해 학생이 이해했는지 확인하는 질문이 필요합니다)",
            }
    return {"question": None, "model_answer": None}


# ====== 세션 관리 함수들 ======

def create_session() -> str:
    session_id = str(uuid4())
    root, current_node = create_initial_tree()
    sessions[session_id] = {
        "root": root,
        "current_node": current_node,
        "all_doc": [],
        "student_info": {},
        "exam_info": {},
        "attachments": [],
        "rag_keys": None,
        "tree_save_path": "",
        "active": True,
        "created_at": time.time(),
    }
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    return sessions.get(session_id)


def delete_session(session_id: str):
    sessions.pop(session_id, None)


async def start_test(
    session_id: str,
    student_info: Dict[str, Any],
    exam_info: Dict[str, Any],
    attachment_urls: List[str],
    rag_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """테스트 시작 → 첫 질문 반환"""
    session = sessions[session_id]
    session["student_info"] = student_info
    session["exam_info"] = exam_info
    session["rag_keys"] = rag_keys
    session["attachments"] = await prepare_attachments_async(attachment_urls)

    student_info_str = "_".join(str(v) for v in student_info.values())
    exam_name = exam_info.get("name", "")
    session["tree_save_path"] = TREE_PATH.format(
        time=time.strftime("%Y%m%d_%H%M%S"),
        exam_info=exam_name,
        student_info=student_info_str,
        client_id=session_id,
    )

    # TF-IDF 모드일 때 데이터 로드
    if SEARCH_MODE == "tfidf":
        chapter = exam_info.get("chapter", "")
        session["all_doc"] = await run_blocking(load_dataset, CHUNK_PATH.format(chapter=chapter))

    # 초기 질문 설정
    print(f"[{session_id}] DEBUG: exam_info received: {exam_info}")  # <--- Added Log
    content = exam_info.get("content", "No Question Error")
    current_node = session["current_node"]
    current_node.value["follow_up"]["question"] = content.replace("\n\n", "\n")

    question = current_node.value["follow_up"]["question"]
    print(f"[{session_id}] 테스트 시작 - 초기 질문: {question[:50]}...")

    return {
        "session_id": session_id,
        "type": "base_question",
        "message": question,
    }


async def submit_answer(session_id: str, user_input: str) -> Dict[str, Any]:
    """답변 제출 → 다음 질문 또는 종료"""
    session = sessions[session_id]
    root = session["root"]
    current_node = session["current_node"]
    rag_keys = session.get("rag_keys")

    # 답변 저장
    current_node.value["student_answer"]["answer"] = user_input
    print(f"[{session_id}] 📥 사용자 인풋: {user_input[:80]}...")

    # Missing Point 생성
    history = current_node.get_history(root)
    history_str = format_qa_history(history)

    last_question = current_node.value["follow_up"]["question"]
    search_query = f"{last_question} {user_input}"

    chunk_str = await filter_chunks_async(
        query=search_query,
        all_doc=session.get("all_doc"),
        rag_keys=rag_keys,
    )

    attachments = session.get("attachments", [])
    missing_list = await missing_points_async(
        history_str, chunk_str, attachments=attachments if attachments else None
    )

    sorted_missing_list = prioritize_missing_points(missing_list)

    for mp in sorted_missing_list:
        node_value = {
            "q_type": "follow_up",
            "missing_point": mp,
            "follow_up": {},
            "student_answer": {"answer": None},
        }
        ntype = 0 if mp["type"] == "missing" else 1
        node = Node(node_value, ntype=ntype)
        current_node.add_child(node)

    print(f"[{session_id}] Missing Point 생성 완료: {len(sorted_missing_list)}개")

    # 다음 노드 탐색
    current_node = current_node.next_in_preorder()
    while True:
        while current_node:
            if current_node.value in ("Root", "Bonus"):
                pass
            elif current_node.should_skip_node():
                print(f"[{session_id}] 강제 노드 스킵")
                pass
            else:
                break
            current_node = current_node.next_in_preorder()

        if not current_node:
            # 트리 저장
            tree_data = None
            if session["tree_save_path"]:
                tree_data = await run_blocking(save_tree_to_json, root, session["tree_save_path"])

            session["active"] = False
            return {
                "session_id": session_id,
                "type": "finish",
                "reason": "No More Question",
                "tree": tree_data,
            }

        # 후속 질문 생성
        if current_node.value["q_type"] in ("base_question", "bonus_question"):
            question = current_node.value["follow_up"]["question"]
        else:
            history = current_node.parent.get_history(root)
            history_str = format_qa_history(history)

            mp_content = current_node.value["missing_point"].get("content", "")
            mp_desc = current_node.value["missing_point"].get("description", "")
            refine_query = f"{mp_content} {mp_desc}"

            refined_chunk_str = await filter_chunks_async(
                query=refine_query,
                all_doc=session.get("all_doc"),
                rag_keys=rag_keys,
            )

            attachments = session.get("attachments", [])
            follow_up = await make_question_with_retry(
                history_str,
                current_node.value["missing_point"],
                refined_chunk_str,
                attachments=attachments if attachments else None,
            )

            if follow_up["question"] is None:
                current_node = current_node.delete()
                continue

            is_dup = await run_blocking(is_question_duplicate, follow_up["question"], history)
            if is_dup:
                current_node = current_node.delete()
                continue

            current_node.value["follow_up"] = follow_up
            question = current_node.value["follow_up"]["question"]

        break

    # 세션 갱신
    session["current_node"] = current_node

    # 트리 저장
    tree_data = None
    if session["tree_save_path"]:
        tree_data = await run_blocking(save_tree_to_json, root, session["tree_save_path"])

    return {
        "session_id": session_id,
        "type": current_node.value["q_type"],
        "message": question,
        "tree": tree_data,
    }


async def continue_session(
    student_info: Dict[str, Any],
    exam_info: Dict[str, Any],
    attachment_urls: List[str],
    rag_keys: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """세션 이어하기"""
    student_info_str = "_".join(str(v) for v in student_info.values())
    exam_name = exam_info.get("name", "")

    tree_path = find_latest_tree_file(exam_name, student_info_str)
    if not tree_path or not os.path.exists(tree_path):
        return {"error": "저장된 세션 파일을 찾을 수 없습니다."}

    with open(tree_path, "r", encoding="utf-8") as f:
        tree_dict = json.load(f)

    root = reconstruct_tree(tree_dict)

    session_id = str(uuid4())
    current_node = find_last_unanswered_node(root) if root.children[0] else root

    sessions[session_id] = {
        "root": root,
        "current_node": current_node,
        "all_doc": [],
        "student_info": student_info,
        "exam_info": exam_info,
        "attachments": await prepare_attachments_async(attachment_urls),
        "rag_keys": rag_keys,
        "tree_save_path": tree_path,
        "active": True,
        "created_at": time.time(),
    }

    if SEARCH_MODE == "tfidf":
        chapter = exam_info.get("chapter", "")
        sessions[session_id]["all_doc"] = await run_blocking(
            load_dataset, CHUNK_PATH.format(chapter=chapter)
        )

    # 현재 질문 반환
    question = ""
    if isinstance(current_node.value, dict) and current_node.value.get("follow_up", {}).get("question"):
        question = current_node.value["follow_up"]["question"]

    return {
        "session_id": session_id,
        "type": "continue_session",
        "message": question,
        "tree": root._node_to_dict(),
    }


async def end_test(session_id: str) -> Dict[str, Any]:
    """테스트 강제 종료"""
    session = sessions.get(session_id)
    if not session:
        return {"error": "세션을 찾을 수 없습니다."}

    root = session["root"]
    tree_data = None
    if session["tree_save_path"]:
        tree_data = await run_blocking(save_tree_to_json, root, session["tree_save_path"])

    session["active"] = False
    return {
        "session_id": session_id,
        "type": "finish",
        "reason": "Time Out",
        "tree": tree_data,
    }
