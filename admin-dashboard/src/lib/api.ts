import { API_BASE_URL } from './config'

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    credentials: 'include'
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json() as Promise<T>
}

export function connectSSE(path: string, onMessage: (ev: MessageEvent) => void): EventSource {
  const es = new EventSource(`${API_BASE_URL}${path}`, { withCredentials: true } as any)
  es.onmessage = onMessage
  return es
}


