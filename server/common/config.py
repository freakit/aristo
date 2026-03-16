"""
Common configuration module
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ====== Server Settings ======
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# ====== RAG Settings ======
RAG_SEARCH_TOP_K = int(os.getenv("RAG_SEARCH_TOP_K", "5"))
RAG_USE_RERANKER = os.getenv("RAG_USE_RERANKER", "true").lower() == "true"
SEARCH_MODE = os.getenv("SEARCH_MODE", "rag").lower()
