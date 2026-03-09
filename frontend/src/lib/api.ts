/**
 * api.ts — 공통 API 헬퍼
 *
 * Firebase ID Token을 자동으로 Authorization: Bearer <token> 헤더에 주입합니다.
 * Firebase 유저가 없는 경우(더미 로그인)엔 토큰 없이 요청합니다.
 */
import { firebaseAuth } from './firebase'

const API_BASE = '/api'

/** Firebase ID Token 획득 (없으면 null) */
async function getToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

/** 공통 fetch 래퍼 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`[${res.status}] ${path} — ${errBody}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  postForm: <T>(path: string, form: FormData) =>
    apiFetch<T>(path, { method: 'POST', body: form }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, {
      method: 'DELETE',
    }),
}

/**
 * SSE(Server-Sent Events) 연결 헬퍼
 * @returns cleanup 함수 (EventSource를 닫음)
 */
export function openSSE(
  path: string,
  onMessage: (data: string) => void,
  onError?: (e: Event) => void
): () => void {
  const es = new EventSource(`${API_BASE}${path}`)
  es.onmessage = (e) => onMessage(e.data)
  if (onError) es.onerror = onError
  return () => es.close()
}

/**
 * WebSocket 연결 헬퍼 (/ws/tutor)
 * Firebase 토큰이 있으면 ?token=<idToken> 쿼리파라미터로 전달
 */
export async function openTutorWS(): Promise<WebSocket> {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  const token = await getToken()
  const url = token
    ? `${protocol}://${host}/ws/tutor?token=${encodeURIComponent(token)}`
    : `${protocol}://${host}/ws/tutor`
  return new WebSocket(url)
}

// ──────────────────────────────────────────────────────────
// 튜터 모드 API
// ──────────────────────────────────────────────────────────

export interface TutorStartResponse {
  session_id: string
  type: 'explain'
  explanation: string
  key_concepts: string[]
  question: string
  turn: number
  firestoreSessionId?: string | null
}

export interface TutorReplyResponse {
  session_id: string
  type: 'guide' | 'complete'
  feedback: string
  supplement: string
  question: string | null
  is_complete: boolean
  turn: number
}

export interface TutorEndResponse {
  session_id: string
  type: 'summary'
  summary: string
  strengths: string[]
  areas_to_review: string[]
  total_turns: number
}

/** 튜터 세션 시작 — AI가 주제를 설명하고 첫 질문을 반환 */
export function startTutor(
  topic: string,
  options?: { vectorDocIds?: string[]; sessionId?: string }
): Promise<TutorStartResponse> {
  return api.post<TutorStartResponse>('/tutor/start', {
    topic,
    vectorDocIds: options?.vectorDocIds ?? [],
    sessionId: options?.sessionId ?? null,
  })
}

/** 학생 답변 제출 → 피드백 + 보충 + 다음 질문 */
export function replyTutor(
  sessionId: string,
  answer: string
): Promise<TutorReplyResponse> {
  return api.post<TutorReplyResponse>('/tutor/reply', {
    session_id: sessionId,
    answer,
  })
}

/** 튜터 세션 종료 → 학습 요약 반환 */
export function endTutor(sessionId: string): Promise<TutorEndResponse> {
  return api.post<TutorEndResponse>('/tutor/end', {
    session_id: sessionId,
  })
}

// ──────────────────────────────────────────────────────────
// Live Question API (Gemini Live)
// ──────────────────────────────────────────────────────────

export interface LiveSessionStartRequest {
  student_info: Record<string, any>;
  exam_info: {
    name?: string;
    content?: string;
    first_question?: string;
  };
  rag_keys?: string[] | null;
  system_prompt_override?: string | null;
  study_goals?: string[] | null;
}

export interface LiveSessionStartResponse {
  session_id: string;
  ws_url: string;
}

export function createLiveSession(data: LiveSessionStartRequest): Promise<LiveSessionStartResponse> {
  return api.post<LiveSessionStartResponse>('/live-question/session', data)
}

export async function openLiveQuestionWS(sessionId: string): Promise<WebSocket> {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  // Route through Vite proxy to FastAPI
  const url = `${protocol}://${host}/api/live-question/ws/${sessionId}`
  return new WebSocket(url)
}

export function getLiveSessionResult(sessionId: string): Promise<any> {
  return api.get(`/live-question/session/${sessionId}/result`)
}

export function generateLiveGoals(ragKeys: string[]): Promise<{ goals: string[] }> {
  return api.post<{ goals: string[] }>('/live-question/generate-goals', { rag_keys: ragKeys })
}

