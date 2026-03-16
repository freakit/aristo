# Aristo Server API Specifications

> **Version:** 4.0.0
> **Server:** `http://localhost:8000`
> **Swagger Documentation:** `http://localhost:8000/docs`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [How to Run](#3-how-to-run)
4. [Live Question API - Gemini Live Socratic Tutor ★](#4-live-question-api---gemini-live-socratic-tutor-)
5. [RAG API - Retrieval-Augmented Generation](#5-rag-api---retrieval-augmented-generation)
6. [Common Endpoints](#6-common-endpoints)
7. [Environment Variables](#7-environment-variables)
8. [WebSocket Message Protocol](#8-websocket-message-protocol)
9. [Function Calling Tools List](#9-function-calling-tools-list)

---

## 1. Overview

Aristo Server is a Python FastAPI server providing real-time Socratic tutoring based on **Gemini Live API + RAG**.

| API | Prefix | Description |
|-----|--------|-------------|
| **Live Question** ★ | `/api/live-question` | **Gemini Live + RAG: Real-time Voice Socratic Tutor** |
| RAG | `/api/rag` | PDF Chunking, Embedding, Hybrid Search |

---

## 2. Project Structure

```
server/
├── main.py
├── common/
│   ├── config.py
│   └── ai_client.py             # Gemini API Client
├── apis/
│   ├── liveQuestion/            # Gemini Live + RAG Socratic Tutor ★
│   │   ├── router.py            # WebSocket + REST CRUD Router
│   │   ├── service.py           # Gemini Live Session Management / Tool Execution
│   │   ├── prompts.py           # System Prompts (LIVE_TUTOR_SYSTEM_PROMPT_KR/EN)
│   │   └── models.py            # Request/Response Pydantic Models
│   └── rag/
│       ├── router.py
│       └── vectordb.py          # ChromaDB VectorDBManager
├── sessions/                    # Saves Missing.md / Completed.md per session
├── requirements.txt
└── .env.example
```

---

## 3. How to Run

```bash
pip install -r requirements.txt
cp .env.example .env   # Enter GEMINI_API_KEY
python main.py
# Or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Live Question API - Gemini Live Socratic Tutor ★

A real-time voice tutor combining **Gemini Live API (WebSocket) + ChromaDB RAG Function Calling**.
The AI retrieves materials using RAG to conduct Socratic questioning and automatically tracks conceptual points (Missing/Completed) in the student's answers.

### Flow

```
POST /api/live-question/session  →  Create Session (returns session_id, ws_url)
         ↓
WS   /api/live-question/ws/{id} →  Gemini Live Connection (Audio streaming starts)
         ↓ (Real-time Q&A)
Send {"type":"end"}             →  End Session (status: completed)
         ↓
GET  /api/live-question/session/{id}/result  →  Fetch Final Result
```

### 4.1 Create Session

```
POST /api/live-question/session
```

**Request Body:**
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

| Field | Required | Description |
|---|---|---|
| `student_info` | ○ | Student Info (free-form dict) |
| `exam_info.content` | ○ | Exam Topic/Instructions (Injected into AI system prompt) |
| `exam_info.first_question` | - | First question the AI reads via voice when the session starts |
| `rag_keys` | - | List of document keys for ChromaDB search |
| `system_prompt_override` | - | Custom system prompt (Uses default KR prompt if empty) |

**Response:**
```json
{
  "session_id": "uuid",
  "status": "pending",
  "message": "Session created. Please connect via WebSocket.",
  "ws_url": "/api/live-question/ws/uuid"
}
```

### 4.2 WebSocket — Audio Streaming

```
WS /api/live-question/ws/{session_id}
```

Refer to [Section 8](#8-websocket-message-protocol) for detailed message protocol.

### 4.3 Fetch Session Information

```
GET /api/live-question/session/{session_id}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "active",
  "student_info": {"name": "John Doe"},
  "exam_info": {"name": "OS Final Exam"},
  "created_at": 1741234567.89,
  "ended_at": null,
  "has_gemini_connection": true,
  "transcript_count": 6
}
```

### 4.4 Fetch Chat Transcript

```
GET /api/live-question/session/{session_id}/transcript
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "transcript": [
    {"role": "ai", "text": "Please explain why page tables are necessary.", "timestamp": 1741234567.89},
    {"role": "user_text", "text": "To convert virtual addresses to physical addresses.", "timestamp": 1741234570.12}
  ],
  "total": 2
}
```

> `role: "ai"` — Gemini AI speech text
> `role: "user_text"` — Student text input
> Real-time audio input is processed by Gemini, so there's no text conversion recorded by the server.

### 4.5 Fetch Final Result

```
GET /api/live-question/session/{session_id}/result
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "student_info": {"name": "John Doe"},
  "exam_info": {"name": "OS Final Exam"},
  "transcript": [...],
  "missing_points": ["Did not mention TLB miss handling flow"],
  "completed_points": [
    {"point": "Role of page tables", "how_resolved": "Student explained correctly", "timestamp": 1741234580.0}
  ],
  "duration_seconds": 185.3,
  "created_at": 1741234567.89,
  "ended_at": 1741234753.19
}
```

### 4.6 Other Endpoints

```
GET    /api/live-question/sessions                       # List all sessions
DELETE /api/live-question/session/{session_id}           # Delete session
GET    /api/live-question/session/{session_id}/missing   # List Missing points
GET    /api/live-question/session/{session_id}/completed # List Completed points
```

---

## 5. RAG API - Retrieval-Augmented Generation

### 5.1 Upload PDF

```
POST /api/rag/upload
Content-Type: multipart/form-data
```

**Parameters**: `file` (PDF), `uid`, `window_size`(1), `overlap_tokens`(150), `max_tokens`(1000), `strategy`("auto")

**Response:**
```json
{
  "key": "uuid",
  "message": "Upload successful, processing in background.",
  "source": "lecture_slide.pdf",
  "uploaded_at": "2026-03-09T12:00:00"
}
```

### 5.2 Streaming Processing Logs (SSE)

```
GET /api/rag/upload-logs/{key}
```

**SSE Status values**: `"processing"` → `"success"` | `"error"` | `"ping"`

### 5.3 Hybrid Search

```
POST /api/rag/search
```

**Request Body:**
```json
{
  "query": "Role of page tables",
  "top_k": 5,
  "use_reranker": true,
  "keys": ["uuid-key"]
}
```

### 5.4 Source Management

```
GET    /api/rag/sources           # List sources
DELETE /api/rag/sources?key=uuid  # Delete chunks by key
GET    /api/rag/db-info           # ChromaDB status
GET    /api/rag/chunk-count?key=uuid  # Fetch chunk count
```

---

## 6. Common Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Server info and all API list |
| GET | `/api/health` | Check Server health |

---

## 7. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Server Host |
| `PORT` | `8000` | Server Port |
| `GEMINI_API_KEY` | - | Gemini API Key (Required) |
| `GEMINI_LIVE_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini Live Model |
| `RAG_SEARCH_TOP_K` | `5` | Number of RAG search results |
| `SEARCH_MODE` | `rag` | Search mode (`rag` / `tfidf`) |
| `TOP_K_CHUNK` | `5` | Number of check results |

For all environment variables, refer to the `.env.example` file.

---

## 8. WebSocket Message Protocol

### Client → Server

| Type | Format | Description |
|---|---|---|
| Audio | `binary` | PCM 16-bit, 16kHz, mono |
| Text | `{"type":"text","content":"..."}` | Text input (Recorded as `user_text` in transcript) |
| End | `{"type":"end"}` | Session termination request |

### Server → Client

| Type | Format | Description |
|---|---|---|
| Audio | `binary` | PCM 16-bit, 24kHz, mono (Gemini AI voice) |
| `ready` | JSON | Gemini Live Connection complete + Audio setting |
| `transcript` | JSON | AI speech text (`message` field) |
| `turn_complete` | JSON | Gemini completed one turn |
| `tool_call_start` | JSON | Function Calling Started (`data.tool`, `data.args`) |
| `tool_call_end` | JSON | Function Calling Completed |
| `missing_update` | JSON | Missing/Completed list update notification |
| `completed_update` | JSON | Completed list update notification |
| `error` | JSON | Error occurred (`message` field) |

**`ready` Message Example:**
```json
{
  "type": "ready",
  "message": "Gemini Live Connection complete. You can start audio streaming.",
  "data": {"send_sample_rate": 16000, "receive_sample_rate": 24000}
}
```

**`missing_update` Message Example:**
```json
{
  "type": "missing_update",
  "data": {
    "missing_points": ["Did not mention TLB miss handling flow"],
    "completed_points": ["Role of page tables"]
  }
}
```

---

## 9. Function Calling Tools List

Tools automatically called by Gemini Live to retrieve RAG search and evaluation tracking.

| Tool | Parameters | Description |
|---|---|---|
| `search_db` | `query: string` | ChromaDB hybrid search (required before question / answer evaluation) |
| `add_missing_point` | `point: string` | Registers missing concepts from the student's answer into the Missing list |
| `mark_completed` | `point: string`, `how_resolved: string` | Moves Missing items to Completed |

**Result Files:**
Saved automatically to `server/sessions/{session_id}/Missing.md` and `Completed.md` when the session terminates.

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 4.0.0 | 2026-03 | Introduce Gemini Live + RAG Socratic Tutor. Removed `stt`, `voice`, `question`, `tutor` APIs. |
| 3.1.0 | 2026-03 | Added `/api/tutor` AI Tutor mode (reusing question engine) |
| 3.0.0 | 2025-02 | Python embedded server, transformed to REST API, integrated RAG search |
| 2.0.0 | 2025-01 | Node.js + Python Hybrid, WebSocket Q&A |
| 1.0.0 | 2024-12 | Initial WebSocket Server |
