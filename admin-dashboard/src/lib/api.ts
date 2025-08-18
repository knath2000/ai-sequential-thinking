import { API_BASE_URL } from './config'
// In SvelteKit, env vars prefixed with VITE_ are exposed to the client
const INGEST_KEY = (import.meta.env.VITE_ANALYTICS_INGEST_KEY as string) || ''

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(INGEST_KEY ? { 'X-Analytics-Ingest-Key': INGEST_KEY } : {}),
      ...(init.headers || {})
    },
    credentials: 'include'
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json() as Promise<T>
}

export function connectSSE(
  path: string,
  onMessage: (ev: MessageEvent) => void,
  maxRetries: number = 3
): EventSource {
  let retryCount = 0;
  
  function createConnection(): EventSource {
    const es = new EventSource(`${API_BASE_URL}${path}`, { 
      withCredentials: true 
    } as any);
    
    es.onmessage = onMessage;
    
    es.onerror = (error) => {
      console.warn(`SSE connection error (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          es.close();
          return createConnection();
        }, 1000 * retryCount); // Exponential backoff
      } else {
        console.error('SSE connection failed after max retries');
      }
    };
    
    es.onopen = () => {
      retryCount = 0; // Reset on successful connection
      console.log('SSE connection established');
    };
    
    return es;
  }
  
  return createConnection();
}


