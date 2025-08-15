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
  const chatPath = '/v1/chat/completions'
  const explicitRaw = process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL
  const projectId = process.env.LANGDB_PROJECT_ID || ''
  if (explicitRaw && explicitRaw.length) {
    let explicit = explicitRaw.replace(/\/$/, '') // trim trailing slash
    // If explicit already ends with the chatPath, return as-is
    if (explicit.endsWith(chatPath)) return explicit
    // If explicit already ends with '/v1', append '/chat/completions'
    if (explicit.endsWith('/v1')) {
      // ensure project id present
      if (projectId && !explicit.includes(`/${projectId}/`)) explicit = explicit.replace('/v1', `/${projectId}/v1`)
      return explicit + '/chat/completions'
    }
    // otherwise treat explicit as full endpoint or base and append chatPath
    // insert project id if provided
    if (projectId && !explicit.includes(`/${projectId}/`)) {
      explicit = explicit.replace(/\/$/, '') + `/${projectId}`
    }
    return explicit + chatPath
  }
  const baseRaw = (process.env.LANGDB_BASE_URL || '').replace(/\/$/, '')
  if (!baseRaw) return ''
  // include project id if present
  if (projectId && !baseRaw.includes(`/${projectId}/`)) {
    if (baseRaw.endsWith('/v1')) return `${baseRaw.replace('/v1', `/${projectId}/v1`)}/chat/completions`
    return `${baseRaw}/${projectId}${chatPath}`
  }
  if (baseRaw.endsWith('/v1')) return baseRaw + '/chat/completions'
  return `${baseRaw}${chatPath}`
}

function extractJsonArray(text: string): LangdbStep[] | undefined {
  try {
    if (!text || typeof text !== 'string') return undefined
    // Remove common markdown fences
    let t = text.trim()
    if (t.startsWith('```')) {
      // strip fenced code block
      const last = t.lastIndexOf('```')
      if (last > 0) {
        const firstNl = t.indexOf('\n')
        if (firstNl !== -1) t = t.slice(firstNl + 1, last).trim()
      }
    }
    // Try to find a JSON array using regex (non-greedy)
    const arrMatch = t.match(/\[[\s\S]*?\]/)
    if (arrMatch && arrMatch[0]) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        // continue to other heuristics
      }
    }
    // Fallback: look for bracket indices (previous behavior)
    const start = t.indexOf('[')
    const end = t.lastIndexOf(']')
    if (start >= 0 && end > start) {
      const slice = t.slice(start, end + 1)
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return undefined
}

function getAssistantTextFromResponse(data: any): string | undefined {
  if (!data) return undefined
  // OpenAI-like
  if (data.choices?.[0]?.message?.content) return String(data.choices[0].message.content)
  if (data.choices?.[0]?.text) return String(data.choices[0].text)
  // Anthropic-like shapes
  try {
    // LangDB/Anthropic may place assistant text in data.output or data.choices[].message
    if (data.output && Array.isArray(data.output)) {
      // find first content text
      for (const item of data.output) {
        if (item.content) {
          if (typeof item.content === 'string') return item.content
          if (Array.isArray(item.content) && item.content[0]?.text) return item.content[0].text
        }
      }
    }
  } catch (e) {}
  // Last resort: stringify entire body
  try { return JSON.stringify(data) } catch (e) { return undefined }
}

export async function callLangdbChatForSteps(prompt: string, model: string, timeoutMs?: number): Promise<LangdbStepsResult> {
  const url = buildChatUrl()
  const apiKey = process.env.LANGDB_API_KEY || process.env.LANGDB_KEY
  const projectId = process.env.LANGDB_PROJECT_ID
  // Determine effective model: prefer caller `model`, then env, then sensible default
  const effectiveModel = (model && String(model).trim()) || process.env.LANGDB_MODEL || 'gpt-5-mini'
  if (!url || !apiKey || !projectId) {
    const missing: string[] = []
    if (!url) missing.push('LANGDB_CHAT_URL|LANGDB_ENDPOINT|AI_GATEWAY_URL|LANGDB_BASE_URL')
    if (!apiKey) missing.push('LANGDB_API_KEY|LANGDB_KEY')
    if (!projectId) missing.push('LANGDB_PROJECT_ID')
    return { ok: false, error: `Missing LANGDB config: ${missing.join(', ')}` }
  }

  const system = 'You are a planner. Return ONLY a JSON array with 3 objects: {"step_description": string, "progress_pct": number}. Use roughly 20, 45, and 80 for progress_pct.'
  const user = `Produce steps for: ${prompt}`

  const temperature = Number(process.env.LANGDB_TEMPERATURE ?? 0.2)
  const top_p = Number(process.env.LANGDB_TOP_P ?? 1)
  const frequency_penalty = Number(process.env.LANGDB_FREQUENCY_PENALTY ?? 0)
  const presence_penalty = Number(process.env.LANGDB_PRESENCE_PENALTY ?? 0)
  const max_tokens = Number(process.env.LANGDB_MAX_TOKENS ?? 512)

  // Map token param name per-model: GPT-5 models expect max_completion_tokens
  const tokenParamName = String(effectiveModel).toLowerCase().startsWith('gpt-5') ? 'max_completion_tokens' : 'max_tokens'

  const body: any = {
    model: effectiveModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    top_p,
    frequency_penalty,
    presence_penalty,
    stream: false,
  }

  // Assign the correct token param dynamically
  body[tokenParamName] = max_tokens

  // Model-aware param filtering: some models (e.g., gpt-5 family) do not accept custom temperature/top_p
  const allowNonDefaultTemp = String(process.env.LANGDB_ALLOW_NONDEFAULT_TEMPERATURE || '').toLowerCase() === 'true'
  const modelLower = String(effectiveModel || '').toLowerCase()
  const isGpt5Family = modelLower.startsWith('gpt-5') || modelLower.includes('gpt-5-mini')

  if (isGpt5Family) {
    // remove params that GPT-5 models may reject unless explicitly opted-in
    if (!allowNonDefaultTemp) {
      delete body.temperature
      delete body.top_p
    } else {
      // enforce allowed value (1) if opt-in flag is set to true
      body.temperature = Number(process.env.LANGDB_TEMPERATURE ?? 1)
      body.top_p = Number(process.env.LANGDB_TOP_P ?? 1)
    }
  } else {
    // non-gpt5: ensure numeric values are present
    body.temperature = Number(process.env.LANGDB_TEMPERATURE ?? body.temperature ?? 0.2)
    body.top_p = Number(process.env.LANGDB_TOP_P ?? body.top_p ?? 1)
  }

  // Anthropic-specific adjustments: some params may be unsupported and Anthropic expects include_reasoning
  const isAnthropic = String(effectiveModel || '').toLowerCase().startsWith('anthropic/')
  if (isAnthropic) {
    // remove params that Anthropic/LangDB may reject
    delete body.top_p
    delete body.frequency_penalty
    delete body.presence_penalty
    // optional helper param supported by LangDB for Claude Opus
    body.include_reasoning = true
  }

  // Sanity log of payload keys (do not log secrets)
  try {
    console.info('[langdb] request model=', effectiveModel, 'payloadKeys=', Object.keys(body));
  } catch (e) {}

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

    // If LangDB returns structured error object, bubble it up
    if (data && data.error) {
      return { ok: false, error: data.error?.message || JSON.stringify(data.error), raw: data }
    }

    // Extract assistant text robustly
    // Log truncated raw response for debugging (avoid leaking secrets)
    try { console.info('[langdb] raw_response_preview=', JSON.stringify(data).slice(0,800)) } catch (e) {}
    const assistantText = getAssistantTextFromResponse(data)
    if (assistantText) {
      const steps = extractJsonArray(assistantText)
      if (steps?.length) return { ok: true, steps }
    }
    // Fallback: if response is already JSON array
    if (Array.isArray(data)) {
      return { ok: true, steps: data as LangdbStep[] }
    }
    // Return gateway response for debugging when parsing failed
    return { ok: false, error: 'LangDB parse failed', raw: data }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'LangDB request failed' }
  }
}


