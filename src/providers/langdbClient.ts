import axios, { AxiosRequestConfig } from 'axios'
import { getLangDBConfig, getEffectiveModel } from '../config'

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
  const { baseUrl, projectId } = (() => {
    const cfg = getLangDBConfig()
    return { baseUrl: cfg.baseUrl, projectId: cfg.projectId }
  })()
  const chatPath = '/v1/chat/completions'
  const explicitRaw = process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL
  const pid = projectId || ''
  if (explicitRaw && explicitRaw.length) {
    let explicit = explicitRaw.replace(/\/$/, '') // trim trailing slash
    // If explicit already ends with the chatPath, return as-is
    if (explicit.endsWith(chatPath)) return explicit
    // If explicit already ends with '/v1', append '/chat/completions'
    if (explicit.endsWith('/v1')) {
      // ensure project id present
      if (pid && !explicit.includes(`/${pid}/`)) explicit = explicit.replace('/v1', `/${pid}/v1`)
      return explicit + '/chat/completions'
    }
    // otherwise treat explicit as full endpoint or base and append chatPath
    // insert project id if provided
    if (pid && !explicit.includes(`/${pid}/`)) {
      explicit = explicit.replace(/\/$/, '') + `/${pid}`
    }
    return explicit + chatPath
  }
  const baseRaw = (baseUrl || '').replace(/\/$/, '')
  if (!baseRaw) return ''
  // include project id if present
  if (pid && !baseRaw.includes(`/${pid}/`)) {
    if (baseRaw.endsWith('/v1')) return `${baseRaw.replace('/v1', `/${pid}/v1`)}/chat/completions`
    return `${baseRaw}/${pid}${chatPath}`
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

// Simple token estimator (≈4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function callLangdbChatForSteps(
  prompt: string,
  model: string,
  timeoutMs = 15_000
): Promise<LangdbStepsResult> {
  const url = buildChatUrl();
  if (!url) return { ok: false, error: 'LANGDB_CHAT_URL not configured' };

  const inputTokens = estimateTokens(prompt);
  const maxAllowedOutput = 100_000 - inputTokens;
  const safeMaxTokens = Math.min(maxAllowedOutput, 50_000);

  const effectiveModel = getEffectiveModel(model)
  const body: any = {
    model: effectiveModel,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: safeMaxTokens,
    temperature: 0.2,
    stream: false,
  };

  // Strip unsupported params for Anthropic
  if (effectiveModel.startsWith('anthropic/')) {
    delete body.top_p;
    delete body.frequency_penalty;
    delete body.presence_penalty;
    body.include_reasoning = true;
  }

  console.log(`[LangDB] tokens → input:${inputTokens} max_output:${safeMaxTokens} timeout:${timeoutMs}ms`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getLangDBConfig().apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: `LangDB HTTP ${res.status}`, raw: data };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      const steps = extractJsonArray(content);
      if (steps?.length) return { ok: true, steps, raw: data };
    }
    return { ok: false, error: 'LangDB response invalid', raw: data };
  } catch (e: any) {
    return { ok: false, error: e.message || 'LangDB fetch failed' };
  }
}


