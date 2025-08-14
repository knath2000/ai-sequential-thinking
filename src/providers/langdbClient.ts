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
  const explicit = process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL
  if (explicit) {
    // If explicit looks like a base, append path; if it's already the chat path, return as-is
    if (/\/v1\/chat\/completions(\/?$)/.test(explicit)) return explicit
    const cleaned = explicit.replace(/\/$/, '')
    if (/\/v1$/.test(cleaned)) return cleaned + '/chat/completions'
    return cleaned + '/v1/chat/completions'
  }
  const base = (process.env.LANGDB_BASE_URL || '').replace(/\/$/, '')
  if (!base) return ''
  if (/\/v1$/.test(base)) return base + '/chat/completions'
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
  const apiKey = process.env.LANGDB_API_KEY || process.env.LANGDB_KEY
  const projectId = process.env.LANGDB_PROJECT_ID
  const effectiveModel = model || process.env.LANGDB_MODEL || 'gpt-4o'
  if (!url || !apiKey || !projectId) {
    const missing: string[] = []
    if (!url) missing.push('LANGDB_CHAT_URL|LANGDB_ENDPOINT|AI_GATEWAY_URL|LANGDB_BASE_URL')
    if (!apiKey) missing.push('LANGDB_API_KEY|LANGDB_KEY')
    if (!projectId) missing.push('LANGDB_PROJECT_ID')
    return { ok: false, error: `Missing LANGDB config: ${missing.join(', ')}` }
  }

  const system = 'You are a planner. Return ONLY a JSON array with 3 objects: {"step_description": string, "progress_pct": number}. Use roughly 20, 45, and 80 for progress_pct.'
  const user = `Produce steps for: ${prompt}`

  const body = {
    model: effectiveModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  }

  const https = require('https')
  const httpsAgent = new https.Agent({ keepAlive: true, family: 4 })

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Project-Id': projectId,
    },
    httpsAgent,
    timeout: typeof timeoutMs === 'number' ? timeoutMs : 12000,
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
    // Consider it a successful gateway call even if parsing failed
    return { ok: true, steps: [] as LangdbStep[], raw: data }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'LangDB request failed' }
  }
}


