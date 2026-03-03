# Aristo Frontend

> **Stack**: React 18 + TypeScript + Vite + styled-components  
> **Backend**: Node.js Express `:3001` (Vite proxy로 `/api` → `:3001`)

---

## 🖥 페이지 구조

```
src/
├── components/          # 재사용 UI (AppHeader, Button, Card, Logo)
├── hooks/
│   └── AuthContext.tsx  # Firebase onAuthStateChanged + 더미 로그인 상태 관리
├── lib/
│   ├── api.ts           # apiFetch 래퍼 (Bearer 토큰 자동 주입) + 튜터 API 함수
│   └── firebase.ts      # Firebase 앱 초기화
├── pages/
│   ├── LandingPage.tsx  # 랜딩 + 더미 로그인
│   ├── UploadPage.tsx   # PDF 업로드 + SSE 진행 로그
│   ├── AimPage.tsx      # 세션 생성 + 학습 목표 설정
│   └── StudyPage.tsx    # AI 튜터 세션 (설명→질문→피드백→요약)
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

### 4. Study Page (AI 튜터) ★
- 세션 목록 → 세션 선택 → Start Tutoring

**튜터 흐름:**
```
1. [Start] → POST /api/tutor/start
             ↓ 🎓 AI 개념 설명 버블
             ↓ ❓ 첫 이해 확인 질문

2. [답변]  → 마이크(STT: POST /api/stt/transcribe) 또는 텍스트 입력
             ↓ POST /api/tutor/reply
             ↓ 💬 피드백 버블
             ↓ 📖 보충 설명 버블
             ↓ ❓ 다음 질문 (또는 완료)

3. [완료]  → POST /api/tutor/end
             ↓ ✅ 학습 요약 카드 (강점 / 복습 필요 영역)
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
| `startTutor(topic, opts)` | 튜터 세션 시작 |
| `replyTutor(sessionId, answer)` | 답변 제출 |
| `endTutor(sessionId)` | 세션 종료 + 요약 |

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
