"""
공통 설정 모듈
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ====== 서버 설정 ======
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# ====== RAG 설정 ======
RAG_SEARCH_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))
RAG_USE_RERANKER = os.getenv("RAG_USE_RERANKER", "true").lower() == "true"
SEARCH_MODE = os.getenv("SEARCH_MODE", "rag").lower()
