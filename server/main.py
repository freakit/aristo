"""
Aristo Backend - 통합 FastAPI 서버
모든 API를 하나의 서버에서 관리합니다.

서비스:
  - /api/question  : 문제 출제 (소크라틱 Q&A)
  - /api/stt       : 음성 인식 (STT)
  - /api/voice     : 음성 분석 (eGeMAPS/GRBAS)
  - /api/rag       : RAG 파이프라인 (PDF 청킹, 임베딩, 검색, 챗봇)
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
    description="교육 평가 시스템 통합 백엔드 (문제 출제, 음성 분석, STT, RAG)",
    version="3.0.0",
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
from apis.question.router import router as question_router
from apis.stt.router import router as stt_router
from apis.voice.router import router as voice_router
from apis.rag.router import router as rag_router
from apis.liveQuestion.router import router as live_question_router

app.include_router(question_router)
app.include_router(stt_router)
app.include_router(voice_router)
app.include_router(rag_router)
app.include_router(live_question_router)


# ====== 공통 엔드포인트 ======

@app.get("/", tags=["System"])
async def root():
    """서버 정보 및 API 목록"""
    return {
        "name": "Aristo Backend API",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "apis": {
            "question": {
                "prefix": "/api/question",
                "description": "문제 출제 (소크라틱 Q&A 평가)",
                "endpoints": {
                    "start": "POST /api/question/start",
                    "answer": "POST /api/question/answer",
                    "continue": "POST /api/question/continue",
                    "end": "POST /api/question/end",
                    "session": "GET /api/question/session/{id}",
                    "sessions": "GET /api/question/sessions",
                },
            },
            "stt": {
                "prefix": "/api/stt",
                "description": "음성 인식 (Whisper STT)",
                "endpoints": {
                    "transcribe": "POST /api/stt/transcribe",
                },
            },
            "voice": {
                "prefix": "/api/voice",
                "description": "음성 분석 (eGeMAPS, GRBAS)",
                "endpoints": {
                    "analyze": "POST /api/voice/analyze",
                    "transcribe_and_analyze": "POST /api/voice/transcribe-and-analyze",
                },
            },
            "rag": {
                "prefix": "/api/rag",
                "description": "RAG 파이프라인 (PDF → 청킹 → 임베딩 → 검색 → 챗봇)",
                "endpoints": {
                    "chunk_pdfs": "POST /api/rag/chunk-pdfs",
                    "embed_chunks": "POST /api/rag/embed-chunks",
                    "search": "POST /api/rag/search",
                    "chat": "POST /api/rag/chat",
                    "sources": "GET /api/rag/sources",
                    "delete_source": "DELETE /api/rag/sources/{source}",
                    "db_info": "GET /api/rag/db-info",
                    "chunked_files": "GET /api/rag/chunked-files",
                    "download": "GET /api/rag/download/{filename}",
                    "processing_logs": "GET /api/rag/processing-logs",
                },
            },
            "live_question": {
                "prefix": "/api/live-question",
                "description": "실시간 음성 문제 출제 (Gemini Live + RAG)",
                "endpoints": {
                    "create_session": "POST /api/live-question/session",
                    "websocket": "WS /api/live-question/ws/{session_id}",
                    "get_session": "GET /api/live-question/session/{session_id}",
                    "sessions": "GET /api/live-question/sessions",
                    "delete_session": "DELETE /api/live-question/session/{session_id}",
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
    print("🚀 Aristo Backend v3.0.0")
    print("=" * 50)

    # AI 클라이언트 초기화
    init_ai_client()

    print(f"📋 Question API:      /api/question")
    print(f"🎙️ Live Question API: /api/live-question")
    print(f"🎤 STT API:           /api/stt")
    print(f"🔊 Voice API:         /api/voice")
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
