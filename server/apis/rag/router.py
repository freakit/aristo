import os
import json
import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from threading import Lock

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# 모듈 임포트
from apis.rag.pdf_pipeline import process_pdf_with_callback
from apis.rag.chunking_main import DocumentChunker
from apis.rag.vectordb import VectorDBManager

# 전역 설정
TEMP_DIR = Path(tempfile.gettempdir()) / "rag_pipeline"
TEMP_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True)

FIGURES_DIR = Path("./figures")
FIGURES_DIR.mkdir(exist_ok=True)

# 업로드별 로그 큐 (key 기준)
upload_logs: Dict[str, Queue] = {}
upload_locks: Dict[str, Lock] = {}


def add_log(key: str, message: str):
    """특정 key의 로그 큐에 메시지 추가"""
    if key not in upload_logs:
        upload_logs[key] = Queue()
        upload_locks[key] = Lock()
    
    with upload_locks[key]:
        upload_logs[key].put({
            "status": "processing",
            "message": message,
            "timestamp": datetime.now().isoformat()
        })


async def log_generator(key: str):
    """특정 key의 로그 스트림 생성"""
    if key not in upload_logs:
        upload_logs[key] = Queue()
        upload_locks[key] = Lock()
    
    log_queue = upload_logs[key]
    
    yield f"data: {json.dumps({'status': 'connected', 'message': '로그 스트림 연결됨'}, ensure_ascii=False)}\n\n"
    
    timeout_count = 0
    max_timeout = 600
    
    while timeout_count < max_timeout:
        if not log_queue.empty():
            msg = log_queue.get()
            yield f"data: {json.dumps(msg, ensure_ascii=False)}\n\n"
            timeout_count = 0
            
            if msg.get("status") in ["success", "error"]:
                break
        else:
            await asyncio.sleep(0.5)
            timeout_count += 1
            if timeout_count % 10 == 0:
                yield f"data: {json.dumps({'status': 'ping', 'message': 'alive'}, ensure_ascii=False)}\n\n"
    
    yield f"data: {json.dumps({'status': 'done', 'message': '로그 스트림 종료'}, ensure_ascii=False)}\n\n"


# Request/Response 모델
class UploadResponse(BaseModel):
    key: str
    message: str
    source: str
    uploaded_at: str


# 백그라운드 처리 함수
async def process_pdf_background(
    key: str,
    file_path: Path,
    file_name: str,
    uid: str,
    window_size: int,
    overlap_tokens: int,
    max_tokens: int,
    strategy: str,
):
    """백그라운드에서 PDF 처리 (파싱 → 청킹 → 임베딩)"""
    temp_json = None
    chunked_json = None
    temp_chunked = None
    chunks_added = 0
    uploaded_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    try:
        add_log(key, f"[1/3] PDF 파싱 시작: {file_name} (전략: {strategy})")
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            json_output_path = await loop.run_in_executor(
                executor,
                lambda: process_pdf_with_callback(
                    str(file_path),
                    output_dir=str(OUTPUT_DIR),
                    strategy=strategy,
                    log_callback=lambda msg: add_log(key, msg),
                ),
            )
        
            temp_json = Path(json_output_path)
            if not temp_json.exists():
                raise Exception("PDF 파싱 결과 파일이 생성되지 않았습니다.")

            add_log(key, f"[2/3] 청킹 시작 (Window: {window_size}, Overlap: {overlap_tokens})")

            chunker = DocumentChunker(
                use_sliding_window=True,
                window_size=window_size,
                overlap_tokens=overlap_tokens,
                max_chunk_tokens=max_tokens,
            )
            
            chunked_output_path = await loop.run_in_executor(
                executor,
                lambda: chunker.process_file(
                    str(temp_json),
                    str(OUTPUT_DIR),
                    uploaded_at=uploaded_at
                )
            )
            
            chunked_json = Path(chunked_output_path)
            if not chunked_json.exists():
                raise Exception("청킹 결과 파일이 생성되지 않았습니다.")

            add_log(key, f"[3/3] 벡터 DB 임베딩 시작...")

            db_manager = VectorDBManager(
                persist_directory="./chroma_db",
                collection_name="rag_documents",
            )
            
            # key를 메타데이터에 추가
            with open(chunked_json, 'r', encoding='utf-8') as f:
                chunks_data = json.load(f)
            
            for chunk in chunks_data:
                if 'metadata' not in chunk:
                    chunk['metadata'] = {}
                chunk['metadata']['key'] = key
            
            temp_chunked = OUTPUT_DIR / f"{key}_temp_chunked.json"
            with open(temp_chunked, 'w', encoding='utf-8') as f:
                json.dump(chunks_data, f, ensure_ascii=False, indent=2)
            
            chunks_added = await loop.run_in_executor(
                executor,
                lambda: db_manager.add_from_json(str(temp_chunked))
            )

            add_log(key, f"✅ 임베딩 완료: {chunks_added}개 청크 저장됨")
            
            # 성공 로그
            upload_logs[key].put({
                "status": "success",
                "message": f"✅ 전체 처리 완료: {file_name}",
                "chunks_added": chunks_added,
                "timestamp": datetime.now().isoformat()
            })

    except Exception as e:
        error_msg = f"❌ 오류 발생: {str(e)}"
        add_log(key, error_msg)
        upload_logs[key].put({
            "status": "error",
            "message": error_msg,
            "timestamp": datetime.now().isoformat()
        })
    
    finally:
        # 임시 파일 정리
        for temp_file in [file_path, temp_json, chunked_json, temp_chunked]:
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception as e:
                    print(f"임시 파일 삭제 실패 ({temp_file}): {e}")


router = APIRouter(prefix="/api/rag", tags=["RAG"])


@router.post("/upload", response_model=UploadResponse)
async def upload_and_process_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    uid: str = Form(...),
    window_size: int = Form(default=1),
    overlap_tokens: int = Form(default=150),
    max_tokens: int = Form(default=1000),
    strategy: str = Form(default="auto"),
):
    """PDF 업로드 → 백그라운드 처리 (키 반환)"""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    key = str(uuid.uuid4())
    uploaded_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    upload_logs[key] = Queue()
    upload_locks[key] = Lock()
    
    add_log(key, f"📤 업로드 시작: {file.filename}")

    temp_pdf = TEMP_DIR / f"{key}_{file.filename}"
    try:
        with open(temp_pdf, "wb") as f:
            content = await file.read()
            f.write(content)
        
        add_log(key, f"✅ 파일 저장 완료, 백그라운드 처리 시작...")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")
    
    # 백그라운드 태스크 등록
    background_tasks.add_task(
        process_pdf_background,
        key=key,
        file_path=temp_pdf,
        file_name=file.filename,
        uid=uid,
        window_size=window_size,
        overlap_tokens=overlap_tokens,
        max_tokens=max_tokens,
        strategy=strategy,
    )
    
    return UploadResponse(
        key=key,
        message="업로드 성공, 백그라운드에서 처리 중입니다.",
        source=file.filename,
        uploaded_at=uploaded_at,
    )


@router.get("/upload-logs/{key}")
async def stream_upload_logs(key: str):
    """업로드 처리 로그 SSE 스트리밍"""
    return StreamingResponse(
        log_generator(key),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    use_reranker: bool = True
    keys: Optional[List[str]] = None


@router.post("/search")
async def search_documents(req: SearchRequest):
    """RAG 문맥 검색 (Hybrid + Rerank)"""
    try:
        db_manager = VectorDBManager(
            persist_directory="./chroma_db",
            collection_name="rag_documents",
        )
        
        results = db_manager.hybrid_search(
            query=req.query,
            n_results=req.top_k,
            use_reranking=req.use_reranker,
            keys=req.keys
        )
        
        return {"results": results}
    except Exception as e:
        print(f"RAG 검색 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chunk-count")
async def get_chunk_count(key: str):
    """특정 key의 청크 개수 조회"""
    try:
        db_manager = VectorDBManager(
            persist_directory="./chroma_db",
            collection_name="rag_documents",
        )
        
        results = db_manager.collection.get(where={"key": key})
        count = len(results["ids"]) if results and results["ids"] else 0
        
        return {"key": key, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
async def get_sources():
    """벡터 DB의 소스 목록 조회 (key별 그룹화)"""
    try:
        db_manager = VectorDBManager(
            persist_directory="./chroma_db",
            collection_name="rag_documents",
        )
        sources_info = db_manager.get_sources_info()
        return sources_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sources")
async def delete_source(key: str = None):
    """key로 청크 삭제"""
    if not key:
        raise HTTPException(status_code=400, detail="key 파라미터가 필요합니다.")
    
    try:
        db_manager = VectorDBManager(
            persist_directory="./chroma_db",
            collection_name="rag_documents",
        )
        
        deleted = db_manager.delete_by_key(key)
        
        return {
            "success": True,
            "message": f"{deleted}개 청크가 삭제되었습니다.",
            "chunks_deleted": deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
