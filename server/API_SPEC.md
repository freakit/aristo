# Aristo Backend API 명세서

> **버전:** 3.0.0  
> **서버:** `http://localhost:8000`  
> **Swagger 문서:** `http://localhost:8000/docs`

---

## 목차

1. [개요](#1-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [실행 방법](#3-실행-방법)
4. [Question API - 문제 출제](#4-question-api---문제-출제)
5. [STT API - 음성 인식](#5-stt-api---음성-인식)
6. [Voice API - 음성 분석](#6-voice-api---음성-분석)
7. [RAG API - 검색 증강 생성](#7-rag-api---검색-증강-생성)
8. [공통 엔드포인트](#8-공통-엔드포인트)
9. [환경 변수](#9-환경-변수)
10. [검색 모드](#10-검색-모드)

---

## 1. 개요

Aristo Backend는 교육 평가 시스템을 위한 통합 Python FastAPI 서버입니다.

| API | 접두사 | 설명 |
|-----|--------|------|
| Question | `/api/question` | 소크라틱 Q&A 기반 문제 출제 및 평가 |
| STT | `/api/stt` | Whisper 기반 음성 인식 |
| Voice | `/api/voice` | eGeMAPS/GRBAS 기반 음성 품질 분석 |
| RAG | `/api/rag` | PDF 청킹, 임베딩, 하이브리드 검색, 챗봇 |

---

## 2. 프로젝트 구조

```
aristo-backend/
├── main.py                          # FastAPI 앱 진입점
├── common/
│   ├── config.py                    # 공유 설정
│   └── ai_client.py                 # AI 클라이언트 (Gemini)
├── apis/
│   ├── question/                    # 문제 출제 API
│   │   ├── router.py                # API 라우터
│   │   ├── service.py               # 핵심 비즈니스 로직
│   │   ├── models.py                # Pydantic 모델
│   │   ├── prompts.py               # 시스템 프롬프트
│   │   └── tree.py                  # 트리 자료구조
│   ├── stt/                         # STT API
│   │   ├── router.py
│   │   └── service.py
│   ├── voice/                       # 음성 분석 API
│   │   ├── router.py
│   │   └── service.py
│   └── rag/                         # RAG API
│       ├── router.py
│       ├── vectordb.py              # ChromaDB 벡터 DB 관리
│       ├── chunking_main.py         # 문서 청킹
│       ├── pdf_parser.py            # PDF 파싱
│       ├── pdf_pipeline.py          # PDF 처리 파이프라인
│       ├── document_merger.py       # 요소 병합
│       ├── element_converter.py     # 이미지/텍스트 변환
│       └── reranker.py              # Gemini LLM 리랭커
├── requirements.txt
└── .env.example
```

---

## 3. 실행 방법

```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 3. 서버 실행
python main.py
# 또는
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Question API - 문제 출제

소크라틱 Q&A 방식으로 학생의 이해도를 평가합니다.

### 4.1 테스트 시작

```
POST /api/question/start
```

**Request Body:**
```json
{
  "student_info": {
    "name": "홍길동",
    "id": "2024001"
  },
  "exam_info": {
    "name": "생물학 기말고사",
    "chapter": "3",
    "content": "세포 분열의 단계를 설명하시오."
  },
  "attachments": [
    { "url": "https://example.com/image1.png" }
  ],
  "rag_sources": ["biology_ch3.pdf"]
}
```

**Response:**
```json
{
  "session_id": "uuid-string",
  "type": "base_question",
  "message": "세포 분열의 단계를 설명하시오."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| student_info | object | ✅ | 학생 정보 (자유 형식) |
| exam_info | object | ✅ | 시험 정보. `content`에 기본 질문 포함 |
| attachments | array | ❌ | 이미지 첨부파일 URL 목록 |
| rag_sources | array | ❌ | RAG 검색 시 소스 필터 |

---

### 4.2 답변 제출 & 다음 질문

```
POST /api/question/answer
```

**Request Body:**
```json
{
  "session_id": "uuid-string",
  "user_input": "세포 분열은 전기, 중기, 후기, 말기로 나뉩니다..."
}
```

**Response (후속 질문):**
```json
{
  "session_id": "uuid-string",
  "type": "follow_up",
  "message": "전기에서 일어나는 핵심적인 변화는 무엇인가요?",
  "tree": { ... }
}
```

**Response (테스트 종료):**
```json
{
  "session_id": "uuid-string",
  "type": "finish",
  "reason": "No More Question",
  "tree": { ... }
}
```

| 응답 type | 설명 |
|-----------|------|
| `follow_up` | 후속 질문 (Missing Point 기반) |
| `bonus_question` | 보너스 심화 질문 |
| `finish` | 더 이상 질문 없음 / 종료 |

---

### 4.3 세션 이어하기

```
POST /api/question/continue
```

이전에 저장된 트리 파일을 자동 검색하여 세션을 복구합니다.

**Request Body:**
```json
{
  "student_info": { "name": "홍길동", "id": "2024001" },
  "exam_info": { "name": "생물학 기말고사" },
  "attachments": [],
  "rag_sources": null
}
```

---

### 4.4 테스트 강제 종료

```
POST /api/question/end?session_id=uuid-string
```

---

### 4.5 세션 정보 조회

```
GET /api/question/session/{session_id}
```

**Response:**
```json
{
  "session_id": "uuid-string",
  "active": true,
  "student_info": { ... },
  "exam_info": { ... },
  "tree": { ... }
}
```

---

### 4.6 활성 세션 목록

```
GET /api/question/sessions
```

---

### 4.7 세션 삭제

```
DELETE /api/question/session/{session_id}
```

---

## 5. STT API - 음성 인식

### 5.1 음성 → 텍스트 변환

```
POST /api/stt/transcribe
Content-Type: multipart/form-data
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| audio | file | (필수) | 음성 파일 (wav, mp3, webm, m4a) |
| language | string | `auto` | 언어 (`auto` / `kor` / `eng`) |

**Response:**
```json
{
  "success": true,
  "method": "faster-whisper",
  "language": "ko",
  "language_probability": 0.987,
  "text": "세포 분열은 전기 중기 후기 말기로 나뉩니다",
  "segments": [
    { "start": 0.0, "end": 2.5, "text": "세포 분열은" },
    { "start": 2.5, "end": 5.1, "text": "전기 중기 후기 말기로 나뉩니다" }
  ]
}
```

---

## 6. Voice API - 음성 분석

### 6.1 음성 분석

```
POST /api/voice/analyze
Content-Type: multipart/form-data
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| audio | file | (필수) | 음성 파일 |
| whisper_json | string | `""` | STT 결과 JSON (정확도 향상) |
| language | string | `ko` | 분석 언어 (`ko` / `en`) |

**Response 주요 필드:**
```json
{
  "success": true,
  "waveform": [ ... ],
  "pauses": [ ... ],
  "academic_analysis": {
    "fluency_metrics": { "articulation_rate": 4.2, "speech_rate": 3.8, ... },
    "pause_analysis": { "mean_pause_duration": 0.5, ... },
    "prosodic_features": { "f0_mean": 180.5, "intensity_mean_db": -25.3, ... },
    "formant_analysis": { "f1_mean": 500.0, "f2_mean": 1500.0, ... },
    "voice_quality": { "hnr_mean": 15.2, "jitter": 0.02, "shimmer": 0.04, ... },
    "rhythm_metrics": { ... },
    "text_disfluency": { ... }
  },
  "speech_rate": { "total_duration": 30.5, "speech_duration": 25.2, ... },
  "volume": { "mean_volume_db": -25.3, ... },
  "pitch": { "mean_pitch_hz": 180.5, ... },
  "interview_scores": {
    "overall": 75.5,
    "fluency": 80.0,
    "voice_quality": 70.0,
    "prosody": 72.5,
    ...
  }
}
```

---

### 6.2 STT + 음성 분석 통합

```
POST /api/voice/transcribe-and-analyze
Content-Type: multipart/form-data
```

STT와 음성 분석을 한 번에 수행합니다. (기존 Node.js `POST /api/transcribe`의 대체)

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| audio | file | (필수) | 음성 파일 |
| language | string | `auto` | STT 언어 |
| analysis_language | string | `ko` | 분석 언어 |

**Response:** 음성 분석 결과 + `transcription` 필드 추가

---

## 7. RAG API - 검색 증강 생성

### 7.1 PDF 청킹

```
POST /api/rag/chunk-pdfs
Content-Type: multipart/form-data
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| files | file[] | (필수) | PDF 파일 목록 |
| window_size | int | 1 | 슬라이딩 윈도우 크기 |
| overlap_pages | int | 150 | 오버랩 토큰 수 |
| max_tokens | int | 800 | 최대 토큰 수 |

---

### 7.2 청킹 파일 임베딩

```
POST /api/rag/embed-chunks
Content-Type: multipart/form-data
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| file | file | (필수) | 청킹된 JSON 파일 |

**Response:**
```json
{
  "success": true,
  "message": "150개의 청크가 벡터 DB에 저장되었습니다.",
  "chunks_added": 150
}
```

---

### 7.3 하이브리드 검색

```
POST /api/rag/search
```

**Request Body:**
```json
{
  "query": "세포 분열의 전기 과정",
  "top_k": 5,
  "use_hybrid": true,
  "use_reranker": true,
  "vector_weight": 0.7,
  "sources": ["biology_ch3.pdf"]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "chunk_001",
      "text": "전기(prophase)에서는 염색체가 응축되고...",
      "metadata": { "source": "biology_ch3.pdf", "page": "15-16" },
      "similarity": 0.89,
      "rerank_score": 0.95,
      "hybrid_score": 0.92
    }
  ],
  "query": "세포 분열의 전기 과정",
  "total": 5
}
```

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| query | string | (필수) | 검색 쿼리 |
| top_k | int | 5 | 결과 수 |
| use_hybrid | bool | true | 하이브리드 검색 (벡터 + BM25) |
| use_reranker | bool | true | Gemini LLM 리랭킹 |
| vector_weight | float | 0.7 | 벡터 가중치 (0~1) |
| sources | array | null | 소스 필터 |

---

### 7.4 RAG 챗봇

```
POST /api/rag/chat
```

**Request Body:**
```json
{
  "message": "세포 분열에서 가장 중요한 단계는?",
  "n_context": 3,
  "source_filter": ["biology_ch3.pdf"]
}
```

**Response:** SSE (Server-Sent Events) 스트리밍
```
data: {"type": "content", "content": "세포 분열에서 가장 중요한 단계는..."}
data: {"type": "content", "content": " 중기(metaphase)입니다."}
data: {"type": "sources", "sources": [...]}
data: {"type": "done"}
```

---

### 7.5 소스 관리

```
GET /api/rag/sources          # 소스 목록 조회
DELETE /api/rag/sources/{name} # 소스 삭제
GET /api/rag/db-info           # DB 정보 조회
```

---

### 7.6 청킹 파일 관리

```
GET /api/rag/chunked-files          # 청킹 파일 목록
GET /api/rag/download/{filename}    # 청킹 파일 다운로드
GET /api/rag/processing-logs        # 처리 로그 (SSE)
```

---

## 8. 공통 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/` | 서버 정보 및 전체 API 목록 |
| GET | `/api/health` | 서버 상태 확인 |

---

## 9. 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 서버 호스트 |
| `PORT` | `8000` | 서버 포트 |
| `GEMINI_API_KEY` | - | Gemini API 키 (필수) |
| `SEARCH_MODE` | `rag` | 검색 모드 (`rag` / `tfidf`) |
| `TOP_K_CHUNK` | `5` | 검색 결과 수 |
| `NODE_MAX_DEPTH` | `5` | 트리 최대 깊이 |
| `DUPLICATE_THRESHOLD` | `0.65` | 중복 질문 임계값 |

전체 환경 변수는 `.env.example` 파일을 참고하세요.

---

## 10. 검색 모드

Question API는 두 가지 검색 모드를 지원합니다:

### RAG 모드 (`SEARCH_MODE=rag`, 기본값)
- ChromaDB 벡터 데이터베이스 사용
- 하이브리드 검색 (벡터 유사도 + BM25 키워드)
- Gemini LLM 리랭킹
- RRF (Reciprocal Rank Fusion) 스코어 결합
- **사전 작업 필요:** PDF 업로드 → 청킹 → 임베딩 (`/api/rag/chunk-pdfs` → `/api/rag/embed-chunks`)

### TF-IDF 모드 (`SEARCH_MODE=tfidf`)
- 로컬 JSONL 파일 기반
- TF-IDF + Cosine Similarity 검색
- `CHUNK_PATH` 환경변수로 파일 경로 지정
- 별도 사전 작업 불필요

---

## 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| 3.0.0 | 2025-02 | Python 통합 서버, REST API 전환, RAG 검색 연동 |
| 2.0.0 | 2025-01 | Node.js + Python 하이브리드, WebSocket Q&A |
| 1.0.0 | 2024-12 | 초기 WebSocket 서버 |
