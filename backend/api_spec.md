# Aristo Backend API Specifications

> **Base URL**: `/api`
> **Auth**: 🔒 Endpoints require `Authorization: Bearer <Firebase ID Token>` header
> **Backend**: Node.js Express (`:3001`)
> **AI Server**: Python FastAPI (`:8000`) — proxied internally by the Node.js backend

---

## 1. Auth

Firebase Authentication handles login/registration. Backend Auth API is minimized.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register user profile to Firestore post initial login |
| `GET` | `/api/auth/me` | 🔒 | Fetch my user profile |

---

## 2. RAG — Learning Materials Management

PDF → Python RAG Server (Parsing→Chunking→ChromaDB Embedding), metadata stored in Firestore `vectordb`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/rag/upload` | 🔒 | PDF Upload → Start background processing |
| `GET` | `/api/rag/sources` | 🔒 | List of uploaded materials + chunk count |
| `DELETE` | `/api/rag/sources/:docId` | 🔒 | Delete material (Firestore + ChromaDB) |
| `GET` | `/api/rag/upload-logs/:key` | 🔒 | Upload progress SSE streaming |

### `POST /api/rag/upload`

**Request**: `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | `File` | PDF File |

**Response `201`**
```json
{
  "docId": "firestore-auto-id",
  "source": "lecture_slide.pdf",
  "key": "uuid-rag-key",
  "uploaded_at": "2026-03-09T12:00:00",
  "message": "Upload successful, processing in background."
}
```

### `GET /api/rag/upload-logs/:key` (SSE)

Real-time streaming of Python server's processing progress.

**SSE Event Format**
```json
{ "status": "processing", "message": "[1/3] PDF Parsing started: lecture_slide.pdf", "timestamp": "..." }
{ "status": "success", "message": "✅ Complete Processing: 150 chunks saved", "chunks_added": 150 }
{ "status": "error", "message": "❌ Error occurred: ...", "timestamp": "..." }
{ "status": "ping", "message": "alive" }
```

> **Note**: Completion detection relies on `status === "success"` or `status === "error"`.

---

## 3. Sessions — Learning Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | 🔒 | Create a new session |
| `GET` | `/api/sessions` | 🔒 | List my sessions (latest first) |
| `GET` | `/api/sessions/:sessionId` | 🔒 | Fetch session + message details |
| `PATCH` | `/api/sessions/:sessionId/end` | 🔒 | End session |
| `DELETE` | `/api/sessions/:sessionId` | 🔒 | Delete session |

### `POST /api/sessions`

**Request Body**
```json
{
  "title": "OS Studying",
  "vectorDocIds": ["docId1", "docId2"]
}
```

**Response `201`**
```json
{
  "sessionId": "firestore-auto-id",
  "uid": "firebase-uid",
  "title": "OS Studying",
  "vectorDocIds": ["docId1", "docId2"],
  "status": "active",
  "createdAt": "2026-03-09T12:00:00Z"
}
```

---

## 4. Live Question — Gemini Live Socratic Tutor ★

Real-time voice tutor based on **Gemini Live API(WebSocket) + ChromaDB RAG Function Calling**.
The AI retrieves materials while asking Socratic questions, automatically tracking the student's Missing/Completed concepts.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/live-question/session` | 🔒 | Create Live session (returns session_id + ws_url) |
| `WS` | `/api/live-question/ws/:sessionId` | - | Real-time audio streaming WebSocket |
| `GET` | `/api/live-question/session/:sessionId` | 🔒 | Fetch session status |
| `GET` | `/api/live-question/session/:sessionId/transcript` | 🔒 | Fetch chat transcript |
| `GET` | `/api/live-question/session/:sessionId/result` | 🔒 | Final results (transcript + missing + completed) |
| `GET` | `/api/live-question/sessions` | 🔒 | List all sessions |
| `DELETE` | `/api/live-question/session/:sessionId` | 🔒 | Delete session |

### `POST /api/live-question/session`

**Request Body**
```json
{
  "student_info": {"name": "John Doe", "id": "2024001"},
  "exam_info": {
    "name": "OS Final Exam",
    "content": "Explain the difference between paging and segmentation.",
    "first_question": "Please explain why page tables are necessary."
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
  "message": "Session created. Please connect via WebSocket.",
  "ws_url": "/api/live-question/ws/uuid"
}
```

### `WS /api/live-question/ws/:sessionId`

**Client → Server**

| Type | Format | Description |
|---|---|---|
| Audio | `binary` | PCM 16-bit, 16kHz, mono |
| Text | `{"type":"text","content":"..."}` | Text input |
| End | `{"type":"end"}` | End session |

**Server → Client**

| Type | Description |
|---|---|
| `binary` | Gemini AI voice (PCM 24kHz) |
| `{"type":"ready"}` | Connection complete (includes send/receive sample rates) |
| `{"type":"transcript","message":"..."}` | AI speech text |
| `{"type":"turn_complete"}` | Gemini turn completed |
| `{"type":"tool_call_start","data":{...}}` | RAG search / Missing tracking started |
| `{"type":"tool_call_end","data":{...}}` | Tool completed |
| `{"type":"missing_update","data":{...}}` | Missing/Completed list update |
| `{"type":"completed_update","data":{...}}` | Completed list update |
| `{"type":"error","message":"..."}` | Error occurred |

### `GET /api/live-question/session/:sessionId/result`

**Response `200`**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "student_info": {"name": "John Doe"},
  "exam_info": {"name": "OS Final Exam"},
  "transcript": [
    {"role": "ai", "text": "Please explain why page tables are necessary.", "timestamp": 1741234567.89},
    {"role": "user_text", "text": "To convert virtual addresses to physical addresses.", "timestamp": 1741234570.12}
  ],
  "missing_points": ["Did not mention TLB miss handling flow"],
  "completed_points": [
    {"point": "Role of page tables", "how_resolved": "Student explained correctly", "timestamp": 1741234580.0}
  ],
  "duration_seconds": 185.3,
  "created_at": 1741234567.89,
  "ended_at": 1741234753.19
}
```

---

## 5. Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | Check server health |

---

## Changelog (Removed old APIs)

| Old Path | Reason |
|---|---|
| `POST /api/auth/signup` | Replaced by Firebase Auth |
| `POST /api/auth/login` | Replaced by Firebase Auth |
| `GET/POST /api/exams/*` | Exam feature removed |
| `POST /api/ai-proxy/ask` | Replaced by Live Question API |
| `POST /api/tutor/start` | Replaced by `/api/live-question/session` + WebSocket |
| `POST /api/tutor/reply` | Replaced by WebSocket audio streaming |
| `POST /api/tutor/end` | Replaced by WebSocket `{"type":"end"}` |
| `POST /api/question/start` | Replaced by Live Question API |
| `POST /api/stt/transcribe` | Replaced by Gemini Live audio streaming |

