# ARISTO — AI-powered Real-time Interactive Speaking Tutor & Orchestrator

An AI-based oral tutoring platform developed by **FreakIT**.
When a student uploads a PDF, the AI retrieves materials using RAG and evaluates understanding in real-time through Socratic questioning.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| PDF Upload & Vectorization | PDF → Parsed in Python RAG Server → Chunking → ChromaDB Embedding |
| **Gemini Live Tutor Mode** ★ | Real-time Socratic voice evaluation based on Gemini Live API + RAG Function Calling |
| Missing / Completed Tracking | AI automatically tracks missing concepts from student answers → Saved as MD files per session |
| Real-time Voice Streaming | PCM 16kHz audio → WebSocket → Gemini Live AI voice response |
| Firebase Auth | Login with Google account, all APIs authenticated with ID Token |

---

## 🏗️ Architecture

```
[Browser: React + Vite]
        ↓  /api/*  (Vite proxy → :3001)
[backend: Node.js / Express - :3001]
  ├─ Firebase Auth (JWT Verification)
  ├─ Firestore (Sessions, Messages, Vector Metadata)
  └─ HTTP proxy ──→ [server: Python FastAPI - :8000]
                        ├─ /api/live-question  (Gemini Live + RAG Socratic Tutor) ★
                        └─ /api/rag            (PDF Pipeline)
```

---

## 🛠 Tech Stack

### Frontend (`frontend/`)
| | |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | styled-components |
| Routing | react-router-dom |
| Auth | Firebase Client SDK (`onAuthStateChanged`) |
| API | Custom `apiFetch` wrapper (Auto-injects Bearer token) + WebSocket |

### Backend (`backend/`)  ─ Node.js Express (:3001)
| | |
|---|---|
| Auth | Firebase Admin SDK (`verifyFirebaseToken` middleware) |
| DB | Cloud Firestore (`sessions`, `vectordb`, `users` collections) |
| RAG Integration | axios → Python server `/api/rag/*` |
| Live Integration | WebSocket proxy → Python server `/api/live-question/ws/*` |

### Server (`server/`) — Python FastAPI (:8000)
| | |
|---|---|
| Framework | FastAPI + Uvicorn |
| AI | Google Gemini Live API (`gemini-2.5-flash-native-audio-preview`) |
| Vector DB | ChromaDB (Local) |
| RAG | PDF Parsing → Chunking → Embedding → Hybrid Search |
| Live Tutor | Gemini Live WebSocket + RAG Function Calling (`search_db` / `add_missing_point` / `mark_completed`) |

---

## 🚀 How to Run

### Prerequisites
- Node.js v18+
- Python 3.12+
- Firebase Project (Firestore, Auth enabled)
- Gemini API Key

### 1. Python AI Server (`server/`)

```bash
cd server
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt

# .env Configuration
cp .env.example .env
# GEMINI_API_KEY=...

python main.py
# → http://localhost:8000
# → Swagger: http://localhost:8000/docs
```

### 2. Node.js Backend (`backend/`)

```bash
cd backend
npm install

# .env Configuration
cp .env.example .env
# Enter FIREBASE_STORAGE_BUCKET, AI_SERVER_URL
# Place the serviceAccountKey.json file in the backend/ root

npm run dev
# → http://localhost:3001
```

### 3. Frontend (`frontend/`)

```bash
cd frontend
npm install

# .env Configuration
cp .env.example .env
# Enter VITE_FIREBASE_* and VITE_API_URL

npm run dev
# → http://localhost:5173
```

---

## 📂 Project Structure

```
aristo/
├── backend/                 # Node.js Express Server (:3001)
│   ├── config/              # Firebase, Logger Configuration
│   ├── controllers/         # RAG, Live Question, Sessions Controllers
│   ├── middleware/          # verifyFirebaseToken
│   ├── repositories/        # Firestore CRUD
│   ├── routes/              # auth / rag / sessions / live-question
│   ├── services/            # rag, sessions, python-api Services
│   ├── api_spec.md          # Node.js API Specifications
│   └── server.js
├── server/                  # Python FastAPI Server (:8000)
│   ├── apis/
│   │   ├── liveQuestion/    # Gemini Live + RAG Socratic Tutor ★
│   │   │   ├── router.py    # WebSocket + REST CRUD
│   │   │   ├── service.py   # Gemini Live Session Management / Tool Execution
│   │   │   ├── prompts.py   # System Prompts (KR/EN)
│   │   │   └── models.py    # Request/Response Models
│   │   └── rag/             # RAG Pipeline
│   ├── common/              # ai_client, config
│   ├── sessions/            # Stores Missing.md / Completed.md per session
│   ├── API_SPEC.md          # Python API Specifications
│   └── main.py
└── frontend/                # React + Vite Frontend (:5173)
    ├── src/
    │   ├── components/      # Common Components like AppHeader, Button, Card
    │   ├── hooks/           # AuthContext (Firebase Integration)
    │   ├── lib/             # api.ts (fetch/WebSocket wrapper)
    │   ├── pages/           # Landing / Upload / Aim / Study
    │   └── styles/          # theme
    └── vite.config.ts       # /api, /ws proxy → :3001
```

---

## 🔗 API Flow Summary

### Live Tutor Session (Core Feature)

```
1. POST /api/live-question/session   → Create Session (Returns session_id + ws_url)
2. WS   /api/live-question/ws/{id}   → WebSocket Connection (Gemini Live Bridge)
   ├─ Client→Server: PCM Audio (binary) or {"type":"text","content":"..."}
   ├─ Server→Client: binary (Gemini AI Voice) / JSON Events
   │     ready | transcript | turn_complete
   │     tool_call_start | tool_call_end
   │     missing_update | completed_update | error
   └─ Client→Server: {"type":"end"}  → End Session
3. GET  /api/live-question/session/{id}/result  → Final Results (transcript, missing, completed)
```

### RAG Pipeline

```
1. POST /api/rag/upload              → Upload PDF (Background processing)
2. GET  /api/rag/upload-logs/:key    → SSE Progress log streaming
3. GET  /api/rag/sources             → My Materials List
4. DELETE /api/rag/sources/:docId    → Delete Material
```

---

## ⚖️ License

**Copyright © 2025 FreakIT. All rights reserved.**
This software is the property of FreakIT. Unauthorized reproduction, distribution, and commercial use are prohibited.