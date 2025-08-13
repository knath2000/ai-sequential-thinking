import axios, { AxiosRequestConfig } from 'axios'

export interface LangdbStep {
  step_description: string
  progress_pct: number
}

export interface LangdbStepsResult {
  ok: boolean
  steps?: LangdbStep[]
  error?: string
  raw?: unknown
}

function buildChatUrl(): string {
  const explicit = process.env.LANGDB_CHAT_URL
  if (explicit) return explicit
  const base = (process.env.LANGDB_BASE_URL || '').replace(/\/$/, '')
  return base ? `${base}/v1/chat/completions` : ''
}

function extractJsonArray(text: string): LangdbStep[] | undefined {
  try {
    // naive extraction of first JSON array in text
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start >= 0 && end > start) {
      const slice = text.slice(start, end + 1)
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return undefined
}

export async function callLangdbChatForSteps(prompt: string, model: string, timeoutMs?: number): Promise<LangdbStepsResult> {
  const url = buildChatUrl()
  const apiKey = process.env.LANGDB_API_KEY
  const projectId = process.env.LANGDB_PROJECT_ID
  if (!url || !apiKey || !projectId) {
    return { ok: false, error: 'Missing LANGDB config (LANGDB_CHAT_URL or LANGDB_BASE_URL, LANGDB_API_KEY, LANGDB_PROJECT_ID)' }
  }

  const system = 'You are a planner. Return ONLY a JSON array with 3 objects: {"step_description": string, "progress_pct": number}. Use roughly 20, 45, and 80 for progress_pct.'
  const user = `Produce steps for: ${prompt}`

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  }

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-project-id': projectId,
    },
    timeout: typeof timeoutMs === 'number' ? timeoutMs : 5000,
    validateStatus: () => true,
  }

  try {
    const { data, status } = await axios.post(url, body, config)
    if (status < 200 || status >= 300) {
      return { ok: false, error: `LangDB HTTP ${status}`, raw: data }
    }

    // Try OpenAI-like shape
    const content: string | undefined = data?.choices?.[0]?.message?.content
    if (typeof content === 'string') {
      const steps = extractJsonArray(content)
      if (steps?.length) return { ok: true, steps }
    }
    // Fallback: if response is already JSON array
    if (Array.isArray(data)) {
      return { ok: true, steps: data as LangdbStep[] }
    }
    // Give back raw for debugging
    return { ok: false, error: 'Unrecognized LangDB response shape', raw: data }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'LangDB request failed' }
  }
}


