# Aristo Backend API 명세서

> **Base URL**: `/api`  
> **Auth**: 🔒 엔드포인트는 `Authorization: Bearer <Firebase ID Token>` 헤더 필요  
> **Backend**: Node.js Express (`:3001`)  
> **AI Server**: Python FastAPI (`:8000`) — Node.js 백엔드가 내부에서 프록시

---

## 1. Auth

Firebase Authentication이 로그인/회원가입을 직접 처리. 백엔드 Auth API는 최소화.

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | 최초 로그인 후 Firestore에 유저 프로필 등록 |
| `GET` | `/api/auth/me` | 🔒 | 내 유저 프로필 조회 |

---

## 2. RAG — 학습 자료 관리

PDF → Python RAG 서버(파싱→청킹→ChromaDB 임베딩), 메타데이터는 Firestore `vectordb` 저장.

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/rag/upload` | 🔒 | PDF 업로드 → 백그라운드 처리 시작 |
| `GET` | `/api/rag/sources` | 🔒 | 내 업로드 자료 목록 + 청크 수 |
| `DELETE` | `/api/rag/sources/:docId` | 🔒 | 자료 삭제 (Firestore + ChromaDB) |
| `GET` | `/api/rag/upload-logs/:key` | 🔒 | 업로드 진행 SSE 스트리밍 |

### `POST /api/rag/upload`

**Request**: `multipart/form-data`

| Field | Type | 설명 |
|---|---|---|
| `file` | `File` | PDF 파일 |

**Response `201`**
```json
{
  "docId": "firestore-auto-id",
  "source": "강의자료.pdf",
  "key": "uuid-rag-key",
  "uploaded_at": "2026-03-09T12:00:00",
  "message": "업로드 성공, 백그라운드에서 처리 중입니다."
}
```

### `GET /api/rag/upload-logs/:key` (SSE)

Python 서버 처리 진행상황 실시간 스트리밍.

**SSE 이벤트 형식**
```json
{ "status": "processing", "message": "[1/3] PDF 파싱 시작: 강의자료.pdf", "timestamp": "..." }
{ "status": "success", "message": "✅ 전체 처리 완료: 150개 청크 저장됨", "chunks_added": 150 }
{ "status": "error", "message": "❌ 오류 발생: ...", "timestamp": "..." }
{ "status": "ping", "message": "alive" }
```

> **주의**: 완료 감지는 `status === "success"` 또는 `status === "error"`로 판단.

---

## 3. Sessions — 학습 세션

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/sessions` | 🔒 | 새 세션 생성 |
| `GET` | `/api/sessions` | 🔒 | 내 세션 목록 (최신순) |
| `GET` | `/api/sessions/:sessionId` | 🔒 | 세션 + 메시지 상세 조회 |
| `PATCH` | `/api/sessions/:sessionId/end` | 🔒 | 세션 종료 |
| `DELETE` | `/api/sessions/:sessionId` | 🔒 | 세션 삭제 |

### `POST /api/sessions`

**Request Body**
```json
{
  "title": "운영체제 공부",
  "vectorDocIds": ["docId1", "docId2"]
}
```

**Response `201`**
```json
{
  "sessionId": "firestore-auto-id",
  "uid": "firebase-uid",
  "title": "운영체제 공부",
  "vectorDocIds": ["docId1", "docId2"],
  "status": "active",
  "createdAt": "2026-03-09T12:00:00Z"
}
```

---

## 4. Live Question — Gemini Live 소크라틱 튜터 ★

**Gemini Live API(WebSocket) + ChromaDB RAG Function Calling** 기반 실시간 음성 튜터.  
AI가 자료를 검색하며 소크라틱 질문 진행, 학생 답변의 Missing/Completed 개념 자동 추적.

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/live-question/session` | 🔒 | Live 세션 생성 (session_id + ws_url 반환) |
| `WS` | `/api/live-question/ws/:sessionId` | - | 실시간 오디오 스트리밍 WebSocket |
| `GET` | `/api/live-question/session/:sessionId` | 🔒 | 세션 상태 조회 |
| `GET` | `/api/live-question/session/:sessionId/transcript` | 🔒 | 대화 기록 조회 |
| `GET` | `/api/live-question/session/:sessionId/result` | 🔒 | 최종 결과 (transcript + missing + completed) |
| `GET` | `/api/live-question/sessions` | 🔒 | 전체 세션 목록 |
| `DELETE` | `/api/live-question/session/:sessionId` | 🔒 | 세션 삭제 |

### `POST /api/live-question/session`

**Request Body**
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

**Response `201`**
```json
{
  "session_id": "uuid",
  "status": "pending",
  "message": "세션이 생성되었습니다. WebSocket으로 연결하세요.",
  "ws_url": "/api/live-question/ws/uuid"
}
```

### `WS /api/live-question/ws/:sessionId`

**클라이언트 → 서버**

| 타입 | 형식 | 설명 |
|---|---|---|
| 오디오 | `binary` | PCM 16-bit, 16kHz, mono |
| 텍스트 | `{"type":"text","content":"..."}` | 텍스트 입력 |
| 종료 | `{"type":"end"}` | 세션 종료 |

**서버 → 클라이언트**

| 타입 | 설명 |
|---|---|
| `binary` | Gemini AI 음성 (PCM 24kHz) |
| `{"type":"ready"}` | 연결 완료 (send/receive sample rate 포함) |
| `{"type":"transcript","message":"..."}` | AI 발화 텍스트 |
| `{"type":"turn_complete"}` | Gemini 한 턴 완료 |
| `{"type":"tool_call_start","data":{...}}` | RAG 검색 / Missing 기록 시작 |
| `{"type":"tool_call_end","data":{...}}` | 도구 완료 |
| `{"type":"missing_update","data":{...}}` | Missing/Completed 목록 변경 |
| `{"type":"completed_update","data":{...}}` | Completed 목록 변경 |
| `{"type":"error","message":"..."}` | 오류 발생 |

### `GET /api/live-question/session/:sessionId/result`

**Response `200`**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "student_info": {"name": "홍길동"},
  "exam_info": {"name": "운영체제 기말"},
  "transcript": [
    {"role": "ai", "text": "페이지 테이블이 필요한 이유를 설명해보세요.", "timestamp": 1741234567.89},
    {"role": "user_text", "text": "가상 주소를 물리 주소로 변환합니다.", "timestamp": 1741234570.12}
  ],
  "missing_points": ["TLB 미스 처리 흐름 미언급"],
  "completed_points": [
    {"point": "페이지 테이블 역할", "how_resolved": "학생이 올바르게 설명함", "timestamp": 1741234580.0}
  ],
  "duration_seconds": 185.3,
  "created_at": 1741234567.89,
  "ended_at": 1741234753.19
}
```

---

## 5. Health Check

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | 서버 상태 확인 |

---

## 변경 이력 (삭제된 구 API)

| 구 경로 | 이유 |
|---|---|
| `POST /api/auth/signup` | Firebase Auth로 대체 |
| `POST /api/auth/login` | Firebase Auth로 대체 |
| `GET/POST /api/exams/*` | 시험 기능 제거 |
| `POST /api/ai-proxy/ask` | Live Question API로 대체 |
| `POST /api/tutor/start` | `/api/live-question/session` + WebSocket으로 대체 |
| `POST /api/tutor/reply` | WebSocket 오디오 스트리밍으로 대체 |
| `POST /api/tutor/end` | WebSocket `{"type":"end"}`으로 대체 |
| `POST /api/question/start` | Live Question API로 대체 |
| `POST /api/stt/transcribe` | Gemini Live 음성 스트리밍으로 대체 |
