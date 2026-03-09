"""
Aristo Backend - 통합 FastAPI 서버
모든 API를 하나의 서버에서 관리합니다.

서비스:
  - /api/live-question : Gemini Live + RAG 소크라틱 튜터 (실시간 음성 Q&A)
  - /api/rag           : RAG 파이프라인 (PDF 청킹, 임베딩, 검색)
"""

import sys
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from common.config import HOST, PORT
from common.ai_client import init_ai_client

# ====== FastAPI 앱 생성 ======
app = FastAPI(
    title="Aristo Backend API",
    description="AI 기반 구술 튜터링 서버 (Gemini Live + RAG 소크라틱 평가)",
    version="4.0.0",
)

# ====== CORS 설정 ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== Static Files (RAG figures) ======
figures_dir = Path("./figures")
figures_dir.mkdir(exist_ok=True)
app.mount("/figures", StaticFiles(directory=str(figures_dir)), name="figures")


# ====== 라우터 등록 ======
from apis.rag.router import router as rag_router
from apis.liveQuestion.router import router as live_question_router

app.include_router(rag_router)
app.include_router(live_question_router)


# ====== 공통 엔드포인트 ======

@app.get("/", tags=["System"])
async def root():
    """서버 정보 및 API 목록"""
    return {
        "name": "Aristo Backend API",
        "version": "4.0.0",
        "timestamp": datetime.now().isoformat(),
        "apis": {
            "live_question": {
                "prefix": "/api/live-question",
                "description": "Gemini Live + RAG 소크라틱 튜터 (실시간 음성 Q&A)",
                "endpoints": {
                    "create_session":   "POST   /api/live-question/session",
                    "websocket":        "WS     /api/live-question/ws/{session_id}",
                    "get_session":      "GET    /api/live-question/session/{session_id}",
                    "get_transcript":   "GET    /api/live-question/session/{session_id}/transcript",
                    "get_result":       "GET    /api/live-question/session/{session_id}/result",
                    "get_missing":      "GET    /api/live-question/session/{session_id}/missing",
                    "get_completed":    "GET    /api/live-question/session/{session_id}/completed",
                    "list_sessions":    "GET    /api/live-question/sessions",
                    "delete_session":   "DELETE /api/live-question/session/{session_id}",
                },
            },
            "rag": {
                "prefix": "/api/rag",
                "description": "RAG 파이프라인 (PDF → 청킹 → 임베딩 → 검색)",
                "endpoints": {
                    "upload":           "POST   /api/rag/upload",
                    "upload_logs":      "GET    /api/rag/upload-logs/{key}",
                    "search":           "POST   /api/rag/search",
                    "sources":          "GET    /api/rag/sources",
                    "delete_source":    "DELETE /api/rag/sources/{source}",
                    "db_info":          "GET    /api/rag/db-info",
                    "chunk_count":      "GET    /api/rag/chunk-count",
                },
            },
        },
    }


@app.get("/api/health", tags=["System"])
async def health():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


# ====== 시작 이벤트 ======

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 초기화"""
    print("=" * 50)
    print("🚀 Aristo Backend v4.0.0")
    print("=" * 50)

    # AI 클라이언트 초기화
    init_ai_client()

    print(f"🎙️ Live Question API: /api/live-question")
    print(f"📚 RAG API:           /api/rag")
    print(f"📖 Swagger Docs: http://{HOST}:{PORT}/docs")
    print("=" * 50)


# ====== 실행 ======

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        reload_dirs=[".", "apis", "common"],
    )
