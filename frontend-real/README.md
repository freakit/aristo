# Aristo - AI Tutors for Advanced Learning

Aristo is an AI-powered tutoring platform designed to help students expand their thinking and verify their understanding of academic materials. By utilizing RAG (Retrieval-Augmented Generation) and the Gemini Live API, Aristo engages students in active questioning rather than passive learning.

## 🏢 Company
**FreakIT**

## 🎯 Purpose
- **Active Checking**: AI tutors ask questions to gauge a student's depth of understanding.
- **Thinking Expansion**: Identifies gaps in knowledge and encourages critical thinking.
- **RAG-Powered**: Uses student-uploaded materials (lecture slides, notes) as the knowledge base.

## 🛠 Tech Stack
- **Framework**: `React` (v18+) with `TypeScript`
- **Build Tool**: `Vite`
- **Styling**: `styled-components` (Professional design without gradients)
- **Routing**: `react-router-dom`

## 📁 Project Structure
```text
src/
├── components/   # Reusable UI components (Button, Card, Logo, AppHeader, etc.)
├── pages/        # Main application views
│   ├── LandingPage.tsx
│   ├── UploadPage.tsx
│   ├── AimPage.tsx
│   └── StudyPage.tsx
├── hooks/        # Custom React hooks
├── styles/       # Global styles and theme definitions
└── App.tsx       # Root component and routing configuration
```

---

## 🖥 Pages & Features

### 1. Landing Page
- **Visuals**: Professional black background with white text.
- **Animations**: Subtle shooting star (meteor) animation for a premium feel.
- **Navigation**: Header containing the Aristo Logo and Login/Signup buttons.
- **Auth**: Temporary login logic (button click redirects to Upload Page).

### 2. Upload Page
- **Core Function**: PDF material upload for RAG processing.
- **Workflow**: Automated Vectorization (Chunking -> Embedding to ChromaDB).
- **UX**: Real-time progress logs showing the status of file processing.
- **Navigation**: Header switch for Upload / Aiming / Study phases.

### 3. Aim Page (Goal Setting)
- **Selection**: Choose specific files from the uploaded library.
- **Strategy**: Select between "Conceptual Understanding" or "Practical Application".
- **AI Recommendation**: Gemini analyzes content to generate at least 3 learning objectives and 3 core questions per objective.

### 4. Study Page (Interactive Learning)
- **Interface**: Learning objectives checklist on the left.
- **Interaction**: Voice-based (TTS + Mic) interaction with the AI.
- **Flow**:
    1. AI asks a question (TTS).
    2. Student records answer (Mic).
    3. AI processes response and verifies objective completion.
    4. Move to the next objective until finished.

---

## 🚀 Backend API Integration Guide

When the backend services are ready, the following endpoints should be integrated:

### 1. RAG Processing (Upload Page)

#### A. PDF Chunking
Apply this when a file is dropped into the upload zone.
- **Endpoint**: `POST /api/rag/chunk-pdfs`
- **Type**: `multipart/form-data`
- **Parameters**:
  - `files`: PDF file list
  - `window_size`: 1
  - `overlap_pages`: 150
  - `max_tokens`: 800

#### B. Embedding
Apply this after receiving the chunked JSON.
- **Endpoint**: `POST /api/rag/embed-chunks`
- **Payload**: Chunked JSON file
- **Integration**: Update the progress log state with the returned `chunks_added` count.

### 2. Goal Generation (Aim Page)
- **Logic**: Send selected file IDs and study mode to the server.
- **Output**: Expect a JSON response containing `learning_objectives` and `core_questions`.

### 3. Gemini Live interaction (Study Page)
- **TTS**: Trigger the browser/server TTS when receiving text-based questions from the server.
- **STT**: Capture audio chunks via `MediaRecorder` and send to the transcription/answering endpoint.
- **Verification**: Poll or listen for SSE updates on `objective_status` to toggle the checklist UI.

---

## 🛠 Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```
