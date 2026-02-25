/**
 * api.ts — 공통 API 헬퍼
 *
 * 백엔드는 Firebase ID Token 인증이 필요하지만,
 * 현재 Auth는 더미(로컬 상태)로 유지하므로 토큰 없이 요청합니다.
 * 나중에 Firebase Auth 연동 시 getToken()을 여기서 주입하면 됩니다.
 */

const API_BASE = '/api'

/** 공통 fetch 래퍼 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      // TODO: Firebase Auth 연동 시 여기에 Bearer 토큰 추가
      // 'Authorization': `Bearer ${await getToken()}`,
    },
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

  delete: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
 * 나중에 Firebase 토큰 필요 시 ?token=<idToken> 쿼리파라미터 추가
 */
export function openTutorWS(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  return new WebSocket(`${protocol}://${host}/ws/tutor`)
}
