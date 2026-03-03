# ARISTO — AI-powered Real-time Interactive Speaking Tutor & Orchestrator

**FreakIT**에서 개발한 AI 기반 구술 튜터링 플랫폼.  
학생이 PDF를 업로드하면 AI가 먼저 개념을 설명하고, 소크라틱 질문으로 이해도를 검증합니다.

---

## 🌟 주요 기능

| 기능 | 설명 |
|---|---|
| PDF 업로드 & 벡터화 | PDF → Python RAG 서버에서 파싱 → 청킹 → ChromaDB 임베딩 |
| AI 튜터 모드 | AI가 개념 설명 → 소크라틱 질문 → Missing Point 분석 → 보충 설명 반복 |
| 음성 답변 (STT) | 마이크 녹음 → Whisper STT → 텍스트 변환 후 튜터에 제출 |
| 학습 요약 | 세션 종료 시 강점 / 복습 필요 영역 자동 생성 |
| Firebase Auth | Google 계정으로 로그인, ID Token으로 모든 API 인증 |

---

## �️ 아키텍처

```
[Browser: React + Vite]
        ↓  /api/*  (Vite proxy → :3001)
[backend: Node.js / Express - :3001]
  ├─ Firebase Auth (JWT 검증)
  ├─ Firestore (세션, 메시지, 벡터 메타데이터)
  └─ HTTP proxy ──→ [server: Python FastAPI - :8000]
                        ├─ /api/question  (소크라틱 평가 모드)
                        ├─ /api/tutor     (AI 튜터 모드) ★
                        ├─ /api/rag       (PDF 파이프라인)
                        ├─ /api/stt       (Whisper STT)
                        └─ /api/voice     (음성 분석)
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
| API | 자체 `apiFetch` 래퍼 (Bearer 토큰 자동 주입) |

### Backend (`backend/`)  ─ Node.js Express (:3001)
| | |
|---|---|
| Auth | Firebase Admin SDK (`verifyFirebaseToken` 미들웨어) |
| DB | Cloud Firestore (`sessions`, `vectordb`, `users` 컬렉션) |
| RAG 연동 | axios → Python server `/api/rag/*` |
| Tutor 연동 | axios → Python server `/api/tutor/*` |
| STT 연동 | axios → Python server `/api/stt/transcribe` |

### Server (`server/`) — Python FastAPI (:8000)
| | |
|---|---|
| Framework | FastAPI + Uvicorn |
| AI | Google Gemini API |
| Vector DB | ChromaDB (로컬) |
| RAG | PDF 파싱 → 청킹 → 임베딩 → 하이브리드 검색 |
| Tutor | 기존 소크라틱 엔진(Missing Point + Followup) 재활용 |
| STT | Faster-Whisper |

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
│   ├── controllers/            # RAG, Tutor, STT, Sessions 컨트롤러
│   ├── middleware/             # verifyFirebaseToken
│   ├── repositories/           # Firestore CRUD
│   ├── routes/                 # auth / rag / sessions / tutor / stt
│   ├── services/               # rag, tutor, sessions, python-api 서비스
│   ├── api_spec.md             # Node.js API 명세
│   └── server.js
├── server/                     # Python FastAPI 서버 (:8000)
│   ├── apis/
│   │   ├── question/           # 소크라틱 평가 API
│   │   ├── tutor/              # AI 튜터 API ★ (신규)
│   │   ├── rag/                # RAG 파이프라인
│   │   ├── stt/                # Whisper STT
│   │   └── voice/              # 음성 분석
│   ├── common/                 # ai_client, config
│   ├── API_SPEC.md             # Python API 명세
│   └── main.py
└── frontend-real/              # React + Vite 프론트엔드 (:5173)
    ├── src/
    │   ├── components/         # AppHeader, Button, Card 등 공통 컴포넌트
    │   ├── hooks/              # AuthContext (Firebase 연동)
    │   ├── lib/                # api.ts (fetch 래퍼 + 튜터 API 함수)
    │   ├── pages/              # Landing / Upload / Aim / Study
    │   └── styles/             # theme
    └── vite.config.ts          # /api, /ws 프록시 → :3001
```

---

## 🔗 API 흐름 요약

### 튜터 세션 (핵심 기능)

```
1. POST /api/tutor/start   → 주제 설명 + 첫 이해 확인 질문
2. POST /api/tutor/reply   → 답변 분석 → 피드백 + 보충 + 다음 질문 (반복)
3. POST /api/tutor/end     → 세션 종료 + 학습 요약
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