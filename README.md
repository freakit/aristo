# ARISTO — AI-powered Real-time Interactive Speaking Tutor & Orchestrator

**FreakIT**에서 개발한 AI 기반 구술 튜터링 플랫폼.  
학생이 PDF를 업로드하면 AI가 RAG로 자료를 검색하며 소크라틱 질문으로 이해를 실시간 평가합니다.

---

## 🌟 주요 기능

| 기능 | 설명 |
|---|---|
| PDF 업로드 & 벡터화 | PDF → Python RAG 서버에서 파싱 → 청킹 → ChromaDB 임베딩 |
| **Gemini Live 튜터 모드** ★ | Gemini Live API + RAG Function Calling 기반 실시간 음성 소크라틱 평가 |
| Missing / Completed 추적 | AI가 학생 답변에서 누락 개념을 자동 추적 → 세션별 MD 파일로 저장 |
| 음성 실시간 스트리밍 | PCM 16kHz 오디오 → WebSocket → Gemini Live AI 음성 응답 |
| Firebase Auth | Google 계정으로 로그인, ID Token으로 모든 API 인증 |

---

## 🏗️ 아키텍처

```
[Browser: React + Vite]
        ↓  /api/*  (Vite proxy → :3001)
[backend: Node.js / Express - :3001]
  ├─ Firebase Auth (JWT 검증)
  ├─ Firestore (세션, 메시지, 벡터 메타데이터)
  └─ HTTP proxy ──→ [server: Python FastAPI - :8000]
                        ├─ /api/live-question  (Gemini Live + RAG 소크라틱 튜터) ★
                        └─ /api/rag            (PDF 파이프라인)
```

---

## 🛠 기술 스택

### Frontend (`frontend-real/`)
| | |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | styled-components |
| Routing | react-router-dom |
| Auth | Firebase Client SDK (`onAuthStateChanged`) |
| API | 자체 `apiFetch` 래퍼 (Bearer 토큰 자동 주입) + WebSocket |

### Backend (`backend/`)  ─ Node.js Express (:3001)
| | |
|---|---|
| Auth | Firebase Admin SDK (`verifyFirebaseToken` 미들웨어) |
| DB | Cloud Firestore (`sessions`, `vectordb`, `users` 컬렉션) |
| RAG 연동 | axios → Python server `/api/rag/*` |
| Live 연동 | WebSocket proxy → Python server `/api/live-question/ws/*` |

### Server (`server/`) — Python FastAPI (:8000)
| | |
|---|---|
| Framework | FastAPI + Uvicorn |
| AI | Google Gemini Live API (`gemini-2.5-flash-native-audio-preview`) |
| Vector DB | ChromaDB (로컬) |
| RAG | PDF 파싱 → 청킹 → 임베딩 → 하이브리드 검색 |
| Live Tutor | Gemini Live WebSocket + RAG Function Calling (`search_db` / `add_missing_point` / `mark_completed`) |

---

## 🚀 실행 방법

### 사전 요구사항
- Node.js v18+
- Python 3.12+
- Firebase 프로젝트 (Firestore, Auth 활성화)
- Gemini API Key

### 1. Python AI 서버 (`server/`)

```bash
cd server
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt

# .env 설정
cp .env.example .env
# GEMINI_API_KEY=...

python main.py
# → http://localhost:8000
# → Swagger: http://localhost:8000/docs
```

### 2. Node.js 백엔드 (`backend/`)

```bash
cd backend
npm install

# .env 설정
# PORT=3001
# FIREBASE_STORAGE_BUCKET=...
# AI_SERVER_URL=http://localhost:8000
# (serviceAccountKey.json 필요)

npm run dev
# → http://localhost:3001
```

### 3. 프론트엔드 (`frontend-real/`)

```bash
cd frontend-real
npm install

# .env 설정
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_STORAGE_BUCKET=...
# VITE_FIREBASE_MESSAGING_SENDER_ID=...
# VITE_FIREBASE_APP_ID=...

npm run dev
# → http://localhost:5173
```

---

## 📂 프로젝트 구조

```
aristo/
├── backend/                    # Node.js Express 서버 (:3001)
│   ├── config/                 # Firebase, Logger 설정
│   ├── controllers/            # RAG, Live Question, STT, Sessions 컨트롤러
│   ├── middleware/             # verifyFirebaseToken
│   ├── repositories/           # Firestore CRUD
│   ├── routes/                 # auth / rag / sessions / live-question / stt
│   ├── services/               # rag, sessions, python-api 서비스
│   ├── api_spec.md             # Node.js API 명세
│   └── server.js
├── server/                     # Python FastAPI 서버 (:8000)
│   ├── apis/
│   │   ├── liveQuestion/       # Gemini Live + RAG 소크라틱 튜터 ★
│   │   │   ├── router.py       # WebSocket + REST CRUD
│   │   │   ├── service.py      # Gemini Live 세션 관리 / Tool 실행
│   │   │   ├── prompts.py      # 시스템 프롬프트 (KR/EN)
│   │   │   └── models.py       # 요청/응답 모델
│   │   └── rag/                # RAG 파이프라인
│   ├── common/                 # ai_client, config
│   ├── sessions/               # 세션별 Missing.md / Completed.md 저장
│   ├── API_SPEC.md             # Python API 명세
│   └── main.py
└── frontend-real/              # React + Vite 프론트엔드 (:5173)
    ├── src/
    │   ├── components/         # AppHeader, Button, Card 등 공통 컴포넌트
    │   ├── hooks/              # AuthContext (Firebase 연동)
    │   ├── lib/                # api.ts (fetch/WebSocket 래퍼)
    │   ├── pages/              # Landing / Upload / Aim / Study
    │   └── styles/             # theme
    └── vite.config.ts          # /api, /ws 프록시 → :3001
```

---

## 🔗 API 흐름 요약

### Live 튜터 세션 (핵심 기능)

```
1. POST /api/live-question/session   → 세션 생성 (session_id + ws_url 반환)
2. WS   /api/live-question/ws/{id}  → WebSocket 연결 (Gemini Live 브리지)
   ├─ Client→Server: PCM 오디오 (binary) 또는 {"type":"text","content":"..."}
   ├─ Server→Client: binary (Gemini AI 음성) / JSON 이벤트
   │     ready | transcript | turn_complete
   │     tool_call_start | tool_call_end
   │     missing_update | completed_update | error
   └─ Client→Server: {"type":"end"} → 세션 종료
3. GET  /api/live-question/session/{id}/result  → 최종 결과 (transcript, missing, completed)
```

### RAG 파이프라인

```
1. POST /api/rag/upload              → PDF 업로드 (백그라운드 처리)
2. GET  /api/rag/upload-logs/:key    → SSE 진행 로그 스트리밍
3. GET  /api/rag/sources             → 내 자료 목록
4. DELETE /api/rag/sources/:docId   → 자료 삭제
```

---

## ⚖️ 라이선스

**Copyright © 2025 FreakIT. All rights reserved.**  
이 소프트웨어는 FreakIT의 소유입니다. 무단 복제, 배포, 상업적 이용을 금지합니다.