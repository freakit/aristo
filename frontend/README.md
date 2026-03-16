# Aristo Frontend

> **Stack**: React 18 + TypeScript + Vite + styled-components  
> **Backend**: Node.js Express `:3001` (Vite proxy for `/api` → `:3001`, `/ws` → `:3001`)

---

## 🖥 Page Structure

```
src/
├── components/          # Reusable UI (AppHeader, Button, Card, Logo)
├── hooks/
│   └── AuthContext.tsx  # Firebase onAuthStateChanged + Dummy login state management
├── lib/
│   ├── api.ts           # apiFetch wrapper (Auto-injects Bearer token) + Live Question API functions
│   └── firebase.ts      # Firebase app initialization
├── pages/
│   ├── LandingPage.tsx  # Landing + Dummy login
│   ├── UploadPage.tsx   # PDF upload + SSE progress logs
│   ├── AimPage.tsx      # Create session + Set study goals
│   └── StudyPage.tsx    # Gemini Live Socratic Tutor session ★
├── styles/
│   └── theme.ts         # Design tokens
└── vite-env.d.ts        # Vite environment variable types
```

---

## 📄 Page Details

### 1. Landing Page
- Click Dummy Login button → Navigate to `/upload`
- Automatically reflect login state if Firebase user exists

### 2. Upload Page
- PDF drag & drop upload
- `POST /api/rag/upload` → Real-time progress display via SSE `GET /api/rag/upload-logs/:key`
- Fetch / Delete source materials list (`DELETE /api/rag/sources/:docId`)

### 3. Aim Page
- Select uploaded materials (vectorDocIds)
- Enter study title → Create session `POST /api/sessions`
- Pass state to StudyPage

### 4. Study Page (Gemini Live Tutor) ★

**Flow:**
```
1. [Start] → POST /api/live-question/session
             ↓ Returns session_id + ws_url
             WS /api/live-question/ws/{session_id}
             ↓ binary: Receive Gemini audio (24kHz PCM)
             ↓ binary: Send microphone audio (16kHz PCM)
             ↓ {"type":"ready"} ← Gemini connection complete

2. [Chat]  → Microphone audio → Send binary (PCM 16kHz)
             Or text input {"type":"text","content":"..."}
             ↓ Gemini AI voice response (binary)
             ↓ {"type":"transcript","message":"..."} AI speech subtitles
             ↓ {"type":"missing_update"/"completed_update"} Learning tracking

3. [End]   → Send {"type":"end"}
             End WS connection
             ↓ GET /api/live-question/session/{id}/result
             ↓ Final results (transcript / missing_points / completed_points)
```

---

## 🔐 Authentication

- Detect `onAuthStateChanged` using Firebase Client SDK
- Auto-inject `Authorization: Bearer <Firebase ID Token>` into all API requests
- Request without token for Dummy Login (no Firebase user)

---

## 📦 Key Functions (src/lib/api.ts)

| Function | Description |
|---|---|
| `api.get(path)` | GET request (Auto-inject token) |
| `api.post(path, body)` | POST request |
| `api.postForm(path, form)` | multipart/form-data POST |
| `api.patch(path, body)` | PATCH request |
| `api.delete(path)` | DELETE request |
| `openSSE(path, onMsg)` | Connect SSE EventSource |
| `createLiveSession(params)` | Create Live session (session_id + ws_url) |
| `getLiveResult(sessionId)` | Fetch Final session results |

---

## 🚀 Development Execution

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production build
```

**Environment Variables (`.env`)**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
