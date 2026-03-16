"""
Aristo Backend - Integrated FastAPI Server
Manage all APIs from a single server.

Services:
  - /api/live-question : Gemini Live + RAG Socratic Tutor (Real-time voice Q&A)
  - /api/rag           : RAG Pipeline (PDF chunking, embedding, search)
"""

import sys
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from common.config import HOST, PORT
from common.ai_client import init_ai_client

# ====== Create FastAPI App ======
app = FastAPI(
    title="Aristo Backend API",
    description="AI-based Oral Tutoring Server (Gemini Live + RAG Socratic Evaluation)",
    version="4.0.0",
)

# ====== CORS Settings ======
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


# ====== Register Routers ======
from apis.rag.router import router as rag_router
from apis.liveQuestion.router import router as live_question_router

app.include_router(rag_router)
app.include_router(live_question_router)


# ====== Common Endpoints ======

@app.get("/", tags=["System"])
async def root():
    """Server Information and API List"""
    return {
        "name": "Aristo Backend API",
        "version": "4.0.0",
        "timestamp": datetime.now().isoformat(),
        "apis": {
            "live_question": {
                "prefix": "/api/live-question",
                "description": "Gemini Live + RAG Socratic Tutor (Real-time voice Q&A)",
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
                "description": "RAG Pipeline (PDF -> Chunking -> Embedding -> Search)",
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
    """Check server status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


# ====== Startup Events ======

@app.on_event("startup")
async def startup_event():
    """Initialize on server startup"""
    print("=" * 50)
    print("[Start] Aristo Backend v4.0.0")
    print("=" * 50)

    # Initialize AI client
    init_ai_client()

    print(f"  - Live Question API: /api/live-question")
    print(f"  - RAG API:           /api/rag")
    print(f"  - Swagger Docs:      http://{HOST}:{PORT}/docs")
    print("=" * 50)


# ====== Execute ======

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        reload_dirs=[".", "apis", "common"],
    )
