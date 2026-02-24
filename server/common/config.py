"""
공통 설정 모듈
모든 API에서 공유하는 설정값과 AI 클라이언트를 관리합니다.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ====== 서버 설정 ======
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# ====== AI 설정 (Gemini Only) ======
SETTINGS_GEMINI = {
    "model": os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
    "temperature": float(os.getenv("GEMINI_TEMPERATURE", "0.8")),
    "max_tokens": int(os.getenv("GEMINI_MAX_TOKENS", "4096")),
}

# ====== Question API 설정 ======
CHUNK_PATH = os.getenv("CHUNK_PATH", "./brain_chap{chapter}.jsonl")
TREE_PATH = os.getenv("TREE_PATH", "./trees/tree_{time}_{exam_info}_{student_info}_{client_id}.json")
TOP_K_CHUNK = int(os.getenv("TOP_K_CHUNK", "5"))

EXECUTOR_WORKERS = int(os.getenv("EXECUTOR_WORKERS", "8"))
EXECUTOR_SEM = int(os.getenv("EXECUTOR_SEM", str(EXECUTOR_WORKERS * 2)))

DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.65"))
NODE_MAX_DEPTH = int(os.getenv("NODE_MAX_DEPTH", "5"))

ATTACHMENT_MODE = os.getenv("ATTACHMENT_MODE", "url")  # "url" | "dataurl"

KEYWORD_OVERLAP_THRESHOLD = float(os.getenv("KEYWORD_OVERLAP_THRESHOLD", "0.7"))
MAX_QUESTION_RETRIES = int(os.getenv("MAX_QUESTION_RETRIES", "2"))
MAX_INSUFFICIENT_CHAIN = int(os.getenv("MAX_INSUFFICIENT_CHAIN", "3"))

# ====== RAG 설정 ======
RAG_SEARCH_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))
RAG_USE_RERANKER = os.getenv("RAG_USE_RERANKER", "true").lower() == "true"

# ====== 검색 모드 설정 ======
# "rag" = RAG 시스템 사용 (ChromaDB + 하이브리드 검색)
# "tfidf" = 기존 TF-IDF 기반 로컬 JSONL 검색
SEARCH_MODE = os.getenv("SEARCH_MODE", "rag").lower()

# ====== Voice/STT 설정 ======
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
