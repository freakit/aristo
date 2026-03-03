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
  "uploaded_at": "2026-03-03T12:00:00",
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
  "createdAt": "2026-03-03T12:00:00Z"
}
```

---

## 4. Tutor — AI 튜터 모드 ★

기존 소크라틱 Question 엔진(Missing Point 분석 + 소크라틱 질문 생성)을 재활용.  
AI가 먼저 개념을 설명하고, 이해 확인 질문 → 피드백 → 보충 설명으로 학습을 가이드.

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/tutor/start` | 🔒 | 튜터 세션 시작 (설명 + 첫 질문) |
| `POST` | `/api/tutor/reply` | 🔒 | 학생 답변 제출 (피드백 + 보충 + 다음 질문) |
| `POST` | `/api/tutor/end` | 🔒 | 세션 종료 + 학습 요약 |
| `GET` | `/api/tutor/session/:sessionId` | 🔒 | 세션 상태 조회 |

### `POST /api/tutor/start`

**Request Body**
```json
{
  "topic": "운영체제의 페이징",
  "vectorDocIds": ["docId1", "docId2"],
  "sessionId": "firestore-session-id"
}
```

**Response `201`**
```json
{
  "session_id": "python-tutor-session-uuid",
  "type": "explain",
  "explanation": "페이징(Paging)은 메모리를 동일한 크기의 블록으로 나누는...",
  "key_concepts": ["페이지 테이블", "주소 변환", "TLB"],
  "question": "페이지 테이블이 필요한 이유를 설명해보세요.",
  "turn": 1,
  "firestoreSessionId": "firestore-session-id"
}
```

### `POST /api/tutor/reply`

**Request Body**
```json
{
  "session_id": "python-tutor-session-uuid",
  "answer": "페이지 테이블은 가상 주소를 물리 주소로 변환하기 위해 필요합니다."
}
```

**Response `200` — type: "guide"** (학습 계속)
```json
{
  "session_id": "...",
  "type": "guide",
  "feedback": "좋은 시도입니다! 핵심 역할을 잘 파악했네요.",
  "supplement": "추가로, 페이지 테이블은 각 프로세스마다 별도로 존재하며...",
  "question": "TLB가 없을 때와 있을 때의 메모리 접근 횟수 차이는?",
  "is_complete": false,
  "turn": 2
}
```

**Response `200` — type: "complete"** (학습 완료)
```json
{
  "session_id": "...",
  "type": "complete",
  "feedback": "훌륭합니다! 페이징의 핵심 개념을 모두 이해하셨습니다.",
  "supplement": "핵심 개념을 완벽하게 파악했습니다.",
  "question": null,
  "is_complete": true,
  "turn": 4
}
```

### `POST /api/tutor/end`

**Response `200`**
```json
{
  "session_id": "...",
  "type": "summary",
  "summary": "오늘 페이징 개념을 학습했습니다. 전반적인 이해도가 높았습니다.",
  "strengths": ["페이지 테이블 구조", "주소 변환 과정"],
  "areas_to_review": ["TLB 미스 처리"],
  "total_turns": 4
}
```

---

## 5. STT — 음성 인식

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `POST` | `/api/stt/transcribe` | ❌ | 오디오 파일 → 텍스트 변환 (Whisper) |

**Request**: `multipart/form-data`
- `audio`: 오디오 파일 (webm, wav, mp3 등)

**Response `200`**
```json
{
  "success": true,
  "text": "페이지 테이블은 가상 주소를 물리 주소로...",
  "language": "ko"
}
```

---

## 6. Health Check

| Method | Path | Auth | 설명 |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | 서버 상태 확인 |

---

## 삭제된 구 API

| 구 경로 | 이유 |
|---|---|
| `POST /api/auth/signup` | Firebase Auth로 대체 |
| `POST /api/auth/login` | Firebase Auth로 대체 |
| `GET/POST /api/exams/*` | 시험 기능 제거 |
| `POST /api/ai-proxy/ask` | `/api/tutor/*` 로 대체 |
| `WS /ws/tutor` | HTTP REST 튜터 API로 전환 |
