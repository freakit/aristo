# ARISTO (AI-powered Real-time Interactive Speaking Tutor & Orchestrator)

ARISTO는 **FreakIT**에서 개발한 AI 기반의 혁신적인 구술 시험 및 튜터링 플랫폼입니다.
생성형 AI 음성 어시스턴트를 활용하여 학생과 실시간으로 대화하며 시험을 진행하고, 강력한 부정행위 방지(Proctoring) 기술을 통해 공정한 평가 환경을 제공합니다.

## 🌟 주요 기능 (Key Features)

### 👨‍🏫 교수용 (Teacher)
* **스마트 시험 생성**: 교재나 강의 자료(PDF)를 업로드하면 AI(GPT-4)가 분석하여 서술형/구술형 문제를 자동으로 생성합니다.
* **RAG 기반 학습 보조**: PDF 자료를 RAG(Retrieval-Augmented Generation)로 벡터화하여, 시험 생성 및 질의응답 시 정확한 출처 기반의 답변을 제공합니다.
* **대시보드**: 진행 중인 시험 현황, 응시 학생 수, 실시간 상태 모니터링.
* **학생 관리**: 개별 학생 등록 및 CSV를 통한 대량 일괄 등록 지원.
* **시험 관리**: 시험 일정(공개/오픈/마감), 제한 시간, 챕터 설정 및 첨부 파일 관리.
* **결과 확인**: 학생별 AI 대화 내역(QA 로그), 녹화된 응시 영상, 시선 추적 로그 확인.

### 👨‍🎓 학생용 (Student)
* **AI 실시간 구술 시험**:
    * **Voice AI**: 실제 면접관처럼 AI가 음성으로 질문하고, 학생의 음성 답변을 인식(STT)하여 대화합니다.
    * **Python STT 지원**: OpenAI, Deepgram 외에도 자체 호스팅된 Python Whisper 서버를 통한 STT를 지원합니다.
    * **심층 질문(Follow-up)**: 학생의 답변 내용을 분석하여 AI가 동적으로 꼬리 질문을 생성합니다.
* **부정행위 방지 시스템 (Proctoring)**:
    * **시선 추적 (Gaze Tracking)**: 웹캠을 통해 응시자의 시선이 화면을 벗어나는지 실시간으로 감지합니다 (Calibration 포함).
    * **손 추적 (Hand Tracking)**: 응시 중 불필요한 손 동작이나 타인의 개입을 감지합니다.
    * **전체 화면 녹화**: 시험 전체 과정(화면+시스템 오디오)을 녹화하여 자동으로 서버에 업로드합니다.
    * **외부 소음 감지**: 응시 환경의 소음 레벨을 분석하여 경고합니다.
* **Torpedo Browser 지원**: 보안이 강화된 전용 브라우저 환경을 지원합니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
* **Framework**: React, TypeScript, Vite
* **Styling**: Styled-components
* **AI/Vision**: MediaPipe (FaceMesh, Hands for Client-side Tracking)
* **Audio/Video**: Web Audio API, MediaRecorder API (Custom mixing)
* **State Management**: Context API

### Backend (Node.js)
* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MySQL (mysql2)
* **Storage**: Azure Blob Storage (영상 및 대용량 파일 저장)
* **AI Integration**:
    * **OpenAI**: Realtime API (Voice), GPT-4 (Logic/Generation), Whisper (STT), TTS
    * **Deepgram**: Alternative STT Engine
* **Protocol**: WebSocket (Real-time Communication)

### Backend (Python AI Server)
* **Runtime**: Python 3.12+
* **Framework**: FastAPI
* **AI/ML**:
    * **RAG**: FAISS (Vector DB), Sentence-Transformers (Embedding), LangChain
    * **STT**: OpenAI Whisper (Local/API)
    * **VAD**: Silero VAD

---

## 🚀 설치 및 실행 (Installation)

### 1. 사전 요구사항 (Prerequisites)
* Node.js (v18 이상)
* Python (v3.12 이상)
* MySQL Database
* OpenAI API Key
* Azure Storage Connection String

### 2. 백엔드 설정 (Node.js Backend)

```bash
# 백엔드 폴더로 이동
cd backend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
````

**`backend/.env` 예시:**

```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=socra_db
DB_PORT=3306

# AI & Voice Services
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
PYTHON_API_URL=http://localhost:8000
EXTERNAL_AI_MODEL_NAME=gpt-4o-realtime-preview-2024-10-01

# Cloud Storage
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_RECORDINGS=recordings
AZURE_STORAGE_CONTAINER_ATTACHMENTS=attachments
```

**서버 실행:**

```bash
npm run dev
```

### 3. Python AI 서버 설정 (FastAPI)

```bash
# 서버 폴더로 이동
cd server

# 가상환경 생성 및 활성화 (권장)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정 (.env 파일 생성)
```

**`server/.env` 예시:**

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

**서버 실행:**

```bash
uvicorn main:app --reload --port 8000
```

### 4. 프론트엔드 설정 (Frontend)

```bash
# 프론트엔드 폴더로 이동
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
```

**`frontend/.env` 예시:**

```env
VITE_API_URL=http://localhost:3001/api
VITE_OPENAI_API_KEY=sk-... (선택 사항)
VITE_STT_PROVIDER=python  # python, openai, deepgram
VITE_USE_VAD=true       # true, false
```

**프론트엔드 실행:**

```bash
npm run dev
```

-----

## 📂 프로젝트 구조 (Project Structure)

```
aristo/
├── backend/                 # Node.js 백엔드 서버
│   ├── config/              # 설정 파일 (Logger 등)
│   ├── controllers/         # 비즈니스 로직 (STT, AI Proxy 등)
│   ├── routes/              # API 라우트
│   └── services/            # 서비스 레이어 (PythonAPI, Deepgram 등)
├── server/                  # Python FastAPI AI 서버 (Backend AI)
│   ├── apis/                # RAG, STT API
│   ├── core/                # 핵심 로직 (Chunking, Embedding)
│   └── main.py              # 진입점
├── frontend/                # React 프론트엔드 (Vite)
│   ├── src/                 # 프론트엔드 소스 코드
│   ├── public/              # 정적 자산
│   └── index.html           # 진입점
└── README.md
```

## ⚖️ 라이선스 (License)

**Copyright © 2025 FreakIT. All rights reserved.**

이 소프트웨어와 소스 코드는 FreakIT의 소유입니다. 허가 없는 무단 복제, 배포 및 상업적 이용을 금지합니다.