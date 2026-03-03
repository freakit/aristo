# Aristo Backend API 명세서

> **버전:** 3.1.0  
> **서버:** `http://localhost:8000`  
> **Swagger 문서:** `http://localhost:8000/docs`

---

## 목차

1. [개요](#1-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [실행 방법](#3-실행-방법)
4. [Question API - 평가 모드](#4-question-api---평가-모드)
5. [Tutor API - AI 튜터 모드 ★](#5-tutor-api---ai-튜터-모드-)
6. [STT API - 음성 인식](#6-stt-api---음성-인식)
7. [Voice API - 음성 분석](#7-voice-api---음성-분석)
8. [RAG API - 검색 증강 생성](#8-rag-api---검색-증강-생성)
9. [공통 엔드포인트](#9-공통-엔드포인트)
10. [환경 변수](#10-환경-변수)
11. [검색 모드](#11-검색-모드)

---

## 1. 개요

Aristo Backend는 AI 튜터링 시스템을 위한 통합 Python FastAPI 서버.

| API | 접두사 | 설명 |
|-----|--------|------|
| Question | `/api/question` | 소크라틱 Q&A 평가 모드 |
| **Tutor** | `/api/tutor` | **AI 설명 + 소크라틱 가이드 학습 모드 ★ 신규** |
| STT | `/api/stt` | Whisper 기반 음성 인식 |
| Voice | `/api/voice` | eGeMAPS/GRBAS 기반 음성 품질 분석 |
| RAG | `/api/rag` | PDF 청킹, 임베딩, 하이브리드 검색 |

---

## 2. 프로젝트 구조

```
server/
├── main.py
├── common/
│   ├── config.py
│   └── ai_client.py             # Gemini API 클라이언트
├── apis/
│   ├── question/                # 소크라틱 평가 API
│   │   ├── router.py
│   │   ├── service.py           # Missing Point 분석, 후속 질문 (재활용됨)
│   │   ├── prompts.py           # MISSING / FOLLOWUP / BONUS 프롬프트
│   │   ├── models.py
│   │   └── tree.py
│   ├── tutor/                   # AI 튜터 API ★ (신규)
│   │   ├── router.py
│   │   ├── service.py           # question/service.py 로직 재활용
│   │   └── prompts.py           # EXPLAIN / GUIDE / SUMMARY 프롬프트
│   ├── stt/
│   ├── voice/
│   └── rag/
│       ├── router.py
│       └── vectordb.py
├── requirements.txt
└── .env.example
```

---

## 3. 실행 방법

```bash
pip install -r requirements.txt
cp .env.example .env   # GEMINI_API_KEY 입력
python main.py
# 또는
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Question API - 평가 모드

학생의 지식을 **평가**하는 소크라틱 Q&A.  
학습/튜터 목적이라면 [Tutor API](#5-tutor-api---ai-튜터-모드-) 사용 권장.

### 4.1 테스트 시작
```
POST /api/question/start
```
**Request Body:**
```json
{
  "student_info": { "name": "홍길동", "id": "2024001" },
  "exam_info": { "name": "생물학 기말", "chapter": "3", "content": "세포 분열의 단계를 설명하시오." },
  "attachments": [],
  "rag_keys": ["uuid-key"]
}
```
**Response:** `{ "session_id": "...", "type": "base_question", "message": "..." }`

### 4.2 답변 제출
```
POST /api/question/answer
```
**Request Body:** `{ "session_id": "...", "user_input": "..." }`  
**Response type**: `"follow_up"` | `"bonus_question"` | `"finish"`

### 4.3~4.7 기타
```
POST /api/question/continue       # 세션 이어하기
POST /api/question/end            # 강제 종료 (?session_id=...)
GET  /api/question/session/{id}   # 세션 정보
GET  /api/question/sessions       # 활성 세션 목록
DELETE /api/question/session/{id} # 세션 삭제
```

---

## 5. Tutor API - AI 튜터 모드 ★

기존 Question 서비스의 **Missing Point 분석 + 소크라틱 질문 생성 로직을 재활용**.  
AI가 먼저 개념을 설명하고, 이해를 확인하며, 부족한 부분을 보충 설명합니다.

### 흐름

```
POST /api/tutor/start  →  RAG 검색 → AI 설명 생성 + 첫 질문
        ↓ (학생 답변)
POST /api/tutor/reply  →  Missing Point 분석 → 피드백 + 보충 + 다음 질문  (반복)
        ↓ (is_complete = true)
POST /api/tutor/end    →  학습 요약 생성 (강점 / 복습 필요 영역)
```

### 5.1 튜터 세션 시작

```
POST /api/tutor/start
```

**Request Body:**
```json
{
  "topic": "운영체제의 페이징",
  "rag_keys": ["uuid-key"]
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "type": "explain",
  "explanation": "페이징(Paging)은 물리 메모리를 고정 크기 블록으로 나누는 기법입니다...",
  "key_concepts": ["페이지 테이블", "주소 변환", "TLB"],
  "question": "페이지 테이블이 필요한 이유를 설명해보세요.",
  "turn": 1
}
```

### 5.2 학생 답변 제출

```
POST /api/tutor/reply
```

**Request Body:**
```json
{
  "session_id": "uuid",
  "answer": "페이지 테이블은 가상 주소를 물리 주소로 변환합니다."
}
```

**Response — 학습 계속 (type: "guide"):**
```json
{
  "session_id": "uuid",
  "type": "guide",
  "feedback": "핵심을 잘 파악했습니다!",
  "supplement": "추가로, TLB는 최근 변환 결과를 캐시하여 접근 속도를 높입니다.",
  "next_question": "TLB가 없을 때 메모리 접근은 몇 번 필요한가요?",
  "is_complete": false
}
```

**Response — 학습 완료 (type: "complete"):**
```json
{
  "session_id": "uuid",
  "type": "complete",
  "feedback": "페이징 개념을 완벽하게 이해하셨습니다!",
  "supplement": "",
  "next_question": null,
  "is_complete": true
}
```

### 5.3 세션 종료 + 학습 요약

```
POST /api/tutor/end
```

**Request Body:** `{ "session_id": "uuid" }`

**Response:**
```json
{
  "session_id": "uuid",
  "type": "summary",
  "summary": "오늘 페이징 개념을 학습했습니다. 전반적인 이해도가 높았습니다.",
  "strengths": ["페이지 테이블 구조", "주소 변환 과정"],
  "areas_to_review": ["TLB 미스 처리 흐름"],
  "total_turns": 4
}
```

### 5.4 세션 상태 조회

```
GET /api/tutor/session/{session_id}
```

**Response:**
```json
{
  "session_id": "uuid",
  "topic": "운영체제의 페이징",
  "active": true,
  "turn": 2,
  "history_count": 2,
  "covered_concepts": ["페이지 테이블", "주소 변환", "TLB"]
}
```

---

## 6. STT API - 음성 인식

### 6.1 음성 → 텍스트 변환

```
POST /api/stt/transcribe
Content-Type: multipart/form-data
```

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| audio | file | (필수) | 음성 파일 (wav, mp3, webm, m4a) |
| language | string | `auto` | 언어 (`auto` / `kor` / `eng`) |

**Response:**
```json
{
  "success": true,
  "method": "faster-whisper",
  "language": "ko",
  "text": "세포 분열은 전기 중기 후기 말기로 나뉩니다"
}
```

---

## 7. Voice API - 음성 분석

```
POST /api/voice/analyze                 # 음성 분석 (eGeMAPS, GRBAS)
POST /api/voice/transcribe-and-analyze  # STT + 음성 분석 통합
```

---

## 8. RAG API - 검색 증강 생성

### 8.1 PDF 업로드 (파싱 → 청킹 → 임베딩)

```
POST /api/rag/upload
Content-Type: multipart/form-data
```

**파라미터**: `file` (PDF), `uid`, `window_size`(1), `overlap_tokens`(150), `max_tokens`(1000), `strategy`("auto")

**Response:**
```json
{
  "key": "uuid",
  "message": "업로드 성공, 백그라운드에서 처리 중입니다.",
  "source": "강의자료.pdf",
  "uploaded_at": "2026-03-03T12:00:00"
}
```

### 8.2 처리 로그 스트리밍 (SSE)

```
GET /api/rag/upload-logs/{key}
```

**SSE 상태값**: `"processing"` → `"success"` | `"error"` | `"ping"`  
완료 감지: `status === "success"` 또는 `status === "error"`

### 8.3 하이브리드 검색

```
POST /api/rag/search
```

**Request Body:**
```json
{
  "query": "세포 분열의 전기 과정",
  "top_k": 5,
  "use_reranker": true,
  "keys": ["uuid-key"]
}
```

### 8.4 청크 수 조회

```
GET /api/rag/chunk-count?key=uuid
```

### 8.5 소스 관리

```
GET    /api/rag/sources          # 소스 목록 (ChromaDB key별 그룹화)
DELETE /api/rag/sources?key=uuid # key로 청크 삭제
```

---

## 9. 공통 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/` | 서버 정보 및 전체 API 목록 |
| GET | `/api/health` | 서버 상태 확인 |

---

## 10. 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `HOST` | `0.0.0.0` | 서버 호스트 |
| `PORT` | `8000` | 서버 포트 |
| `GEMINI_API_KEY` | - | Gemini API 키 (필수) |
| `SEARCH_MODE` | `rag` | 검색 모드 (`rag` / `tfidf`) |
| `TOP_K_CHUNK` | `5` | 검색 결과 수 |
| `NODE_MAX_DEPTH` | `5` | 소크라틱 트리 최대 깊이 |
| `DUPLICATE_THRESHOLD` | `0.65` | 중복 질문 TF-IDF 임계값 |
| `KEYWORD_OVERLAP_THRESHOLD` | `0.7` | 중복 질문 키워드 임계값 |

전체 환경 변수는 `.env.example` 파일 참고.

---

## 11. 검색 모드

### RAG 모드 (`SEARCH_MODE=rag`, 기본값)
- ChromaDB 벡터 DB, 하이브리드 검색 (벡터 유사도 + BM25), Gemini LLM 리랭킹
- **사전 작업 필요**: PDF 업로드 → `/api/rag/upload`

### TF-IDF 모드 (`SEARCH_MODE=tfidf`)
- 로컬 JSONL 파일 기반, TF-IDF + Cosine Similarity
- `CHUNK_PATH` 환경변수로 파일 경로 지정

---

## 변경 이력

| 버전 | 날짜 | 변경 사항 |
|---|---|---|
| 3.1.0 | 2026-03 | `/api/tutor` AI 튜터 모드 추가 (question 엔진 재활용), `.env.example` 환경변수 보완 |
| 3.0.0 | 2025-02 | Python 통합 서버, REST API 전환, RAG 검색 연동 |
| 2.0.0 | 2025-01 | Node.js + Python 하이브리드, WebSocket Q&A |
| 1.0.0 | 2024-12 | 초기 WebSocket 서버 |
