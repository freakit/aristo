# Aristo Server API 명세서

> **버전:** 4.0.0  
> **서버:** `http://localhost:8000`  
> **Swagger 문서:** `http://localhost:8000/docs`

---

## 목차

1. [개요](#1-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [실행 방법](#3-실행-방법)
4. [Live Question API - Gemini Live 소크라틱 튜터 ★](#4-live-question-api---gemini-live-소크라틱-튜터-)
5. [RAG API - 검색 증강 생성](#5-rag-api---검색-증강-생성)
6. [공통 엔드포인트](#6-공통-엔드포인트)
7. [환경 변수](#7-환경-변수)
8. [WebSocket 메시지 프로토콜](#8-websocket-메시지-프로토콜)
9. [Function Calling 도구 목록](#9-function-calling-도구-목록)

---

## 1. 개요

Aristo Server는 **Gemini Live API + RAG** 기반 실시간 소크라틱 튜터링을 제공하는 Python FastAPI 서버.

| API | 접두사 | 설명 |
|-----|--------|------|
| **Live Question** ★ | `/api/live-question` | **Gemini Live + RAG: 실시간 음성 소크라틱 튜터** |
| RAG | `/api/rag` | PDF 청킹, 임베딩, 하이브리드 검색 |

---

## 2. 프로젝트 구조

```
server/
├── main.py
├── common/
│   ├── config.py
│   └── ai_client.py             # Gemini API 클라이언트
├── apis/
│   ├── liveQuestion/            # Gemini Live + RAG 소크라틱 튜터 ★
│   │   ├── router.py            # WebSocket + REST CRUD 라우터
│   │   ├── service.py           # Gemini Live 세션 관리 / Tool 실행
│   │   ├── prompts.py           # 시스템 프롬프트 (LIVE_TUTOR_SYSTEM_PROMPT_KR/EN)
│   │   └── models.py            # 요청/응답 Pydantic 모델
│   └── rag/
│       ├── router.py
│       └── vectordb.py          # ChromaDB VectorDBManager
├── sessions/                    # 세션별 Missing.md / Completed.md 저장
├── requirements.txt
└── .env.example
```

---

## 3. 실행 방법

```bash
pip install -r requirements.txt
cp .env.example .env   # GEMINI_API_KEY 입력
python main.py
# 또는
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Live Question API - Gemini Live 소크라틱 튜터 ★

**Gemini Live API(WebSocket) + ChromaDB RAG Function Calling**을 결합한 실시간 음성 튜터.  
AI가 RAG로 자료를 검색하며 소크라틱 질문을 진행하고, 학생 답변의 Missing/Completed 개념을 자동 추적합니다.

### 흐름

```
POST /api/live-question/session  →  세션 생성 (session_id, ws_url 반환)
         ↓
WS   /api/live-question/ws/{id} →  Gemini Live 연결 (오디오 스트리밍 시작)
         ↓ (실시간 Q&A)
{"type":"end"} 전송             →  세션 종료 (status: completed)
         ↓
GET  /api/live-question/session/{id}/result  →  최종 결과 조회
```

### 4.1 세션 생성

```
POST /api/live-question/session
```

**Request Body:**
```json
{
  "student_info": {"name": "홍길동", "id": "2024001"},
  "exam_info": {
    "name": "운영체제 기말",
    "content": "페이징과 세그멘테이션의 차이를 설명하시오.",
    "first_question": "페이지 테이블이 필요한 이유를 설명해보세요."
  },
  "rag_keys": ["uuid-key"],
  "system_prompt_override": null
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `student_info` | ○ | 학생 정보 (자유 형식 dict) |
| `exam_info.content` | ○ | 시험 주제/안내문 (AI 시스템 프롬프트에 주입) |
| `exam_info.first_question` | - | 세션 시작 시 AI가 음성으로 읽을 첫 질문 |
| `rag_keys` | - | ChromaDB 검색 대상 문서 key 목록 |
| `system_prompt_override` | - | 커스텀 시스템 프롬프트 (없으면 기본 KR 프롬프트 사용) |

**Response:**
```json
{
  "session_id": "uuid",
  "status": "pending",
  "message": "세션이 생성되었습니다. WebSocket으로 연결하세요.",
  "ws_url": "/api/live-question/ws/uuid"
}
```

### 4.2 WebSocket — 오디오 스트리밍

```
WS /api/live-question/ws/{session_id}
```

자세한 메시지 프로토콜은 [섹션 8](#8-websocket-메시지-프로토콜) 참조.

### 4.3 세션 정보 조회

```
GET /api/live-question/session/{session_id}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "active",
  "student_info": {"name": "홍길동"},
  "exam_info": {"name": "운영체제 기말"},
  "created_at": 1741234567.89,
  "ended_at": null,
  "has_gemini_connection": true,
  "transcript_count": 6
}
```

### 4.4 대화 기록 조회

```
GET /api/live-question/session/{session_id}/transcript
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "transcript": [
    {"role": "ai", "text": "페이지 테이블이 필요한 이유를 설명해보세요.", "timestamp": 1741234567.89},
    {"role": "user_text", "text": "가상 주소를 물리 주소로 변환하기 위해서입니다.", "timestamp": 1741234570.12}
  ],
  "total": 2
}
```

> `role: "ai"` — Gemini AI 발화 텍스트  
> `role: "user_text"` — 학생 텍스트 입력  
> 실시간 음성 입력은 Gemini가 처리하므로 서버에서 텍스트 변환 기록 없음.

### 4.5 최종 결과 조회

```
GET /api/live-question/session/{session_id}/result
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "student_info": {"name": "홍길동"},
  "exam_info": {"name": "운영체제 기말"},
  "transcript": [...],
  "missing_points": ["TLB 미스 처리 흐름 미언급"],
  "completed_points": [
    {"point": "페이지 테이블 역할", "how_resolved": "학생이 올바르게 설명함", "timestamp": 1741234580.0}
  ],
  "duration_seconds": 185.3,
  "created_at": 1741234567.89,
  "ended_at": 1741234753.19
}
```

### 4.6 기타 엔드포인트

```
GET    /api/live-question/sessions                       # 전체 세션 목록
DELETE /api/live-question/session/{session_id}           # 세션 삭제
GET    /api/live-question/session/{session_id}/missing   # Missing 포인트 목록
GET    /api/live-question/session/{session_id}/completed # Completed 포인트 목록
```

---

## 5. RAG API - 검색 증강 생성

### 5.1 PDF 업로드

```
POST /api/rag/upload
Content-Type: multipart/form-data
```

**파라미터**: `file` (PDF), `uid`, `window_size`(1), `overlap_tokens`(150), `max_tokens`(1000), `strategy`("auto")

**Response:**
```json
{
  "key": "uuid",
  "message": "업로드 성공, 백그라운드에서 처리 중입니다.",
  "source": "강의자료.pdf",
  "uploaded_at": "2026-03-09T12:00:00"
}
```

### 5.2 처리 로그 스트리밍 (SSE)

```
GET /api/rag/upload-logs/{key}
```

**SSE 상태값**: `"processing"` → `"success"` | `"error"` | `"ping"`

### 5.3 하이브리드 검색

```
POST /api/rag/search
```

**Request Body:**
```json
{
  "query": "페이지 테이블 역할",
  "top_k": 5,
  "use_reranker": true,
  "keys": ["uuid-key"]
}
```

### 5.4 소스 관리

```
GET    /api/rag/sources           # 소스 목록
DELETE /api/rag/sources?key=uuid  # key로 청크 삭제
GET    /api/rag/db-info           # ChromaDB 상태
GET    /api/rag/chunk-count?key=uuid  # 청크 수 조회
```

---

## 6. 공통 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/` | 서버 정보 및 전체 API 목록 |
| GET | `/api/health` | 서버 상태 확인 |

---

## 7. 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `HOST` | `0.0.0.0` | 서버 호스트 |
| `PORT` | `8000` | 서버 포트 |
| `GEMINI_API_KEY` | - | Gemini API 키 (필수) |
| `GEMINI_LIVE_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini Live 모델 |
| `RAG_SEARCH_TOP_K` | `5` | RAG 검색 결과 수 |
| `SEARCH_MODE` | `rag` | 검색 모드 (`rag` / `tfidf`) |
| `TOP_K_CHUNK` | `5` | 검색 결과 수 |

전체 환경 변수는 `.env.example` 파일 참고.

---

## 8. WebSocket 메시지 프로토콜

### 클라이언트 → 서버

| 타입 | 형식 | 설명 |
|---|---|---|
| 오디오 | `binary` | PCM 16-bit, 16kHz, mono |
| 텍스트 | `{"type":"text","content":"..."}` | 텍스트 입력 (트랜스크립트에 `user_text`로 기록) |
| 종료 | `{"type":"end"}` | 세션 종료 요청 |

### 서버 → 클라이언트

| 타입 | 형식 | 설명 |
|---|---|---|
| 오디오 | `binary` | PCM 16-bit, 24kHz, mono (Gemini AI 음성) |
| `ready` | JSON | Gemini Live 연결 완료 + 오디오 설정 |
| `transcript` | JSON | AI 발화 텍스트 (`message` 필드) |
| `turn_complete` | JSON | Gemini 한 턴 완료 |
| `tool_call_start` | JSON | Function Calling 시작 (`data.tool`, `data.args`) |
| `tool_call_end` | JSON | Function Calling 완료 |
| `missing_update` | JSON | Missing/Completed 목록 변경 알림 |
| `completed_update` | JSON | Completed 목록 변경 알림 |
| `error` | JSON | 오류 발생 (`message` 필드) |

**`ready` 메시지 예시:**
```json
{
  "type": "ready",
  "message": "Gemini Live 연결 완료. 오디오 스트리밍을 시작하세요.",
  "data": {"send_sample_rate": 16000, "receive_sample_rate": 24000}
}
```

**`missing_update` 메시지 예시:**
```json
{
  "type": "missing_update",
  "data": {
    "missing_points": ["TLB 미스 처리 흐름 미언급"],
    "completed_points": ["페이지 테이블 역할"]
  }
}
```

---

## 9. Function Calling 도구 목록

Gemini Live가 RAG 검색 및 평가 추적을 위해 자동으로 호출하는 도구들.

| 도구 | 파라미터 | 설명 |
|---|---|---|
| `search_db` | `query: string` | ChromaDB 하이브리드 검색 (질문 전 / 답변 평가 전 필수) |
| `add_missing_point` | `point: string` | 학생 답변에서 누락된 개념을 Missing 목록에 등록 |
| `mark_completed` | `point: string`, `how_resolved: string` | Missing 항목을 Completed로 이동 |

**결과 파일:**  
세션 종료 시 `server/sessions/{session_id}/Missing.md` 및 `Completed.md`에 자동 저장.

---

## 변경 이력

| 버전 | 날짜 | 변경 사항 |
|---|---|---|
| 4.0.0 | 2026-03 | Gemini Live + RAG 소크라틱 튜터 도입. `stt`, `voice`, `question`, `tutor` API 제거 |
| 3.1.0 | 2026-03 | `/api/tutor` AI 튜터 모드 추가 (question 엔진 재활용) |
| 3.0.0 | 2025-02 | Python 통합 서버, REST API 전환, RAG 검색 연동 |
| 2.0.0 | 2025-01 | Node.js + Python 하이브리드, WebSocket Q&A |
| 1.0.0 | 2024-12 | 초기 WebSocket 서버 |
