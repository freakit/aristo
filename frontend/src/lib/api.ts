/**
 * api.ts — Common API Helper
 *
 * Automatically injects Firebase ID Token into Authorization: Bearer <token> header.
 * If no Firebase user (dummy login), sends request without token.
 */
import { firebaseAuth } from './firebase'

const API_BASE = '/api'

/** Get Firebase ID Token (returns null if unavailable) */
async function getToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

/** Common fetch wrapper */
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
 * SSE (Server-Sent Events) connection helper
 * @returns cleanup function (closes EventSource)
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
 * WebSocket connection helper (/ws/tutor)
 * Passes Firebase token as ?token=<idToken> query param if available
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
// Tutor mode API
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

/** Start tutor session — AI explains the topic and returns the first question */
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

/** Submit student answer → feedback + supplement + next question */
export function replyTutor(
  sessionId: string,
  answer: string
): Promise<TutorReplyResponse> {
  return api.post<TutorReplyResponse>('/tutor/reply', {
    session_id: sessionId,
    answer,
  })
}

/** End tutor session → return learning summary */
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

