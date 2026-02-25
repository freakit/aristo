# AI Tutor App — API 명세서

> **Base URL**: `/api`
> **Auth**: 모든 🔒 엔드포인트는 `Authorization: Bearer <Firebase ID Token>` 헤더 필요
> **Firebase ID Token**: 프론트엔드에서 `auth.currentUser.getIdToken()` 으로 발급

---

## 1. Auth

Firebase Authentication이 로그인/회원가입을 직접 처리하므로, 백엔드 Auth API는 최소화.

| Method | Path                 | Auth | 설명                                        |
| ------ | -------------------- | ---- | ------------------------------------------- |
| `POST` | `/api/auth/register` | ❌   | 최초 로그인 후 Firestore에 유저 프로필 등록 |
| `GET`  | `/api/auth/me`       | 🔒   | 내 유저 프로필 조회                         |

### `POST /api/auth/register`

Firebase 소셜/이메일 로그인 성공 후, Firestore `users` 컬렉션에 프로필이 없으면 등록.

**Request Body**

```json
{ "name": "홍길동" }
```

**Response `201`**

```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "name": "홍길동",
  "photoURL": null,
  "provider": "google",
  "createdAt": "2026-02-25T12:00:00Z"
}
```

### `GET /api/auth/me`

**Response `200`**

```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "name": "홍길동",
  "photoURL": null
}
```

---

## 2. RAG — 학습 자료 관리

학생이 PDF를 업로드하면 Python RAG 서버가 벡터화하고, 메타데이터는 Firestore `vectordb`에 저장.

| Method   | Path                        | Auth | 설명                                                     |
| -------- | --------------------------- | ---- | -------------------------------------------------------- |
| `POST`   | `/api/rag/upload`           | 🔒   | PDF 업로드 → RAG 서버 벡터화 → Firestore 메타데이터 저장 |
| `GET`    | `/api/rag/sources`          | 🔒   | 내 업로드 자료 목록 조회                                 |
| `DELETE` | `/api/rag/sources/:docId`   | 🔒   | 자료 삭제 (Firestore + RAG 서버)                         |
| `GET`    | `/api/rag/upload-logs/:key` | 🔒   | 업로드 진행상황 SSE 스트리밍                             |

### `POST /api/rag/upload`

**Request**: `multipart/form-data`

| Field  | Type   | 설명     |
| ------ | ------ | -------- |
| `file` | `File` | PDF 파일 |

**Response `201`**

```json
{
  "docId": "firestore-auto-id",
  "source": "강의자료.pdf",
  "key": "rag-vector-key",
  "uploadedAt": "2026-02-25T12:00:00Z"
}
```

### `GET /api/rag/sources`

**Response `200`**

```json
[
  {
    "docId": "firestore-auto-id",
    "source": "강의자료.pdf",
    "key": "rag-vector-key",
    "uploadedAt": "2026-02-25T12:00:00Z"
  }
]
```

### `DELETE /api/rag/sources/:docId`

**Response `200`**

```json
{ "message": "삭제 완료" }
```

---

## 3. Sessions — 튜터링 세션

| Method   | Path                           | Auth | 설명                    |
| -------- | ------------------------------ | ---- | ----------------------- |
| `POST`   | `/api/sessions`                | 🔒   | 새 튜터링 세션 생성     |
| `GET`    | `/api/sessions`                | 🔒   | 내 세션 목록 조회       |
| `GET`    | `/api/sessions/:sessionId`     | 🔒   | 특정 세션 + 메시지 조회 |
| `PATCH`  | `/api/sessions/:sessionId/end` | 🔒   | 세션 종료               |
| `DELETE` | `/api/sessions/:sessionId`     | 🔒   | 세션 삭제               |

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
  "createdAt": "2026-02-25T12:00:00Z"
}
```

### `GET /api/sessions`

**Query Params**: `limit` (기본 20), `before` (커서, optional)

**Response `200`**

```json
[
  {
    "sessionId": "...",
    "title": "운영체제 공부",
    "status": "ended",
    "createdAt": "..."
  }
]
```

### `GET /api/sessions/:sessionId`

메시지 포함 세션 전체 반환.

**Response `200`**

```json
{
  "sessionId": "...",
  "title": "운영체제 공부",
  "status": "active",
  "vectorDocIds": ["docId1"],
  "messages": [
    {
      "msgId": "...",
      "role": "user",
      "content": "페이징이 뭐야?",
      "turn": 1,
      "createdAt": "..."
    },
    {
      "msgId": "...",
      "role": "assistant",
      "content": "페이징은...",
      "turn": 2,
      "createdAt": "..."
    }
  ]
}
```

### `PATCH /api/sessions/:sessionId/end`

**Response `200`**

```json
{ "sessionId": "...", "status": "ended" }
```

---

## 4. Gemini Live — 실시간 AI 튜터 (WebSocket)

Gemini Live API는 HTTP가 아닌 **WebSocket** 기반. 백엔드가 프록시 역할.

| Protocol | Path        | Auth | 설명                          |
| -------- | ----------- | ---- | ----------------------------- |
| `WS`     | `/ws/tutor` | 🔒   | Gemini Live API 양방향 프록시 |

### WebSocket 메시지 프로토콜

**클라이언트 → 서버**

```json
// 세션 시작
{ "type": "START", "sessionId": "firestore-session-id", "vectorKeys": ["key1", "key2"] }

// 음성/텍스트 입력
{ "type": "INPUT", "audioChunk": "<base64>", "turn": 1 }

// 세션 종료
{ "type": "END" }
```

**서버 → 클라이언트**

```json
// AI 응답 청크
{ "type": "CHUNK", "content": "페이징은 ", "turn": 2 }

// AI 응답 완료 (Firestore 저장 완료)
{ "type": "DONE", "msgId": "firestore-msg-id", "turn": 2 }

// 에러
{ "type": "ERROR", "message": "..." }
```

> [!NOTE]
> WebSocket 연결 시 `Authorization` 헤더 또는 `?token=<Firebase ID Token>` 쿼리파라미터로 인증.

---

## 5. Health Check

| Method | Path          | Auth | 설명                           |
| ------ | ------------- | ---- | ------------------------------ |
| `GET`  | `/api/health` | ❌   | 서버 + Firebase 연결 상태 확인 |

**Response `200`**

```json
{ "status": "ok", "firebase": "connected" }
```

---

## 삭제되는 기존 API

| 기존 경로                           | 이유                          |
| ----------------------------------- | ----------------------------- |
| `POST /api/auth/signup` (학번 기반) | Firebase Auth로 대체          |
| `POST /api/auth/login`              | Firebase Auth로 대체          |
| `GET/POST /api/exams/*`             | 시험 기능 제거                |
| `GET/POST /api/students/*`          | 학생 테이블 제거              |
| `GET/POST /api/tree/*`              | 트리 구조 제거                |
| `POST /api/answer-change/*`         | 답변 이력 제거                |
| `POST /api/ai-proxy/ask`            | WebSocket `/ws/tutor` 로 대체 |
