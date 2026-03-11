# Aristo Frontend

> **Stack**: React 18 + TypeScript + Vite + styled-components  
> **Backend**: Node.js Express `:3001` (Vite proxy로 `/api` → `:3001`, `/ws` → `:3001`)

---

## 🖥 페이지 구조

```
src/
├── components/          # 재사용 UI (AppHeader, Button, Card, Logo)
├── hooks/
│   └── AuthContext.tsx  # Firebase onAuthStateChanged + 더미 로그인 상태 관리
├── lib/
│   ├── api.ts           # apiFetch 래퍼 (Bearer 토큰 자동 주입) + Live Question API 함수
│   └── firebase.ts      # Firebase 앱 초기화
├── pages/
│   ├── LandingPage.tsx  # 랜딩 + 더미 로그인
│   ├── UploadPage.tsx   # PDF 업로드 + SSE 진행 로그
│   ├── AimPage.tsx      # 세션 생성 + 학습 목표 설정
│   └── StudyPage.tsx    # Gemini Live 소크라틱 튜터 세션 ★
├── styles/
│   └── theme.ts         # 디자인 토큰
└── vite-env.d.ts        # Vite 환경변수 타입
```

---

## 📄 페이지 상세

### 1. Landing Page
- 더미 로그인 버튼 클릭 → `/upload` 이동
- Firebase 유저가 있으면 자동 로그인 상태 반영

### 2. Upload Page
- PDF 드래그&드롭 업로드
- `POST /api/rag/upload` → SSE `GET /api/rag/upload-logs/:key` 실시간 진행 표시
- 소스 목록 조회 / 삭제 (`DELETE /api/rag/sources/:docId`)

### 3. Aim Page
- 업로드한 자료(vectorDocIds) 선택
- 학습 제목 입력 → `POST /api/sessions` 세션 생성
- StudyPage로 state 전달

### 4. Study Page (Gemini Live 튜터) ★

**흐름:**
```
1. [Start] → POST /api/live-question/session
             ↓ session_id + ws_url 반환
             WS /api/live-question/ws/{session_id}
             ↓ binary: Gemini 음성 수신 (24kHz PCM)
             ↓ binary: 마이크 오디오 전송 (16kHz PCM)
             ↓ {"type":"ready"} ← Gemini 연결 완료

2. [대화]  → 마이크 오디오 → binary 전송 (PCM 16kHz)
             또는 {"type":"text","content":"..."} 텍스트 입력
             ↓ Gemini AI 음성 응답 (binary)
             ↓ {"type":"transcript","message":"..."} AI 발화 자막
             ↓ {"type":"missing_update"/"completed_update"} 학습 추적

3. [종료]  → {"type":"end"} 전송
             WS 연결 종료
             ↓ GET /api/live-question/session/{id}/result
             ↓ 최종 결과 (transcript / missing_points / completed_points)
```

---

## 🔐 인증

- Firebase Client SDK로 `onAuthStateChanged` 감지
- 모든 API 요청에 `Authorization: Bearer <Firebase ID Token>` 자동 주입
- 더미 로그인(Firebase 유저 없음) 시 토큰 없이 요청

---

## 📦 주요 함수 (src/lib/api.ts)

| 함수 | 설명 |
|---|---|
| `api.get(path)` | GET 요청 (토큰 자동 주입) |
| `api.post(path, body)` | POST 요청 |
| `api.postForm(path, form)` | multipart/form-data POST |
| `api.patch(path, body)` | PATCH 요청 |
| `api.delete(path)` | DELETE 요청 |
| `openSSE(path, onMsg)` | SSE EventSource 연결 |
| `createLiveSession(params)` | Live 세션 생성 (session_id + ws_url) |
| `getLiveResult(sessionId)` | 세션 최종 결과 조회 |

---

## 🚀 개발 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드
```

**환경변수 (`.env`)**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
