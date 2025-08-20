import httpClient from '../../utils/httpClient'
import { buildChatUrl } from './urlBuilder'
import { buildLangdbRequestBody } from './request'
import { getAssistantTextFromResponse, extractJsonArrayFromAssistant } from './response'
import { estimateTokens, calculateCostUsd, logLangdbCost } from './cost'
import logger from '../../utils/logger'

export type LangdbStep = { step_description: string; progress_pct: number }

export type LangdbSuccess = { ok: true; steps: LangdbStep[]; meta: { model: string; inputTokens: number; outputTokens: number; costUsd: number } }
export type LangdbFailure = { ok: false; error: string; status?: number; raw?: unknown }
export type LangdbResult = LangdbSuccess | LangdbFailure

export async function callLangdbSteps(prompt: string, model: string, timeoutMs = 15000, opts?: { sessionId?: string; requestId?: string }): Promise<LangdbResult> {
  const url = buildChatUrl()
  if (!url) return { ok: false, error: 'LANGDB_CHAT_URL not configured' }

  const inputTokens = estimateTokens(prompt)
  const body = buildLangdbRequestBody(prompt, model, 50000)

  logger.info({ url, model }, 'Calling LangDB')
  try {
    const res = await httpClient.post(url, body, { timeout: timeoutMs })
    const data = res.data
    if (res.status < 200 || res.status >= 300) {
      logger.error({ status: res.status, data }, 'LangDB non-2xx')
      return { ok: false, error: `LangDB HTTP ${res.status}`, status: res.status, raw: data }
    }

    const assistantText = getAssistantTextFromResponse(data)
    const steps = assistantText ? extractJsonArrayFromAssistant(assistantText) : undefined
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      logger.warn({ data }, 'LangDB returned no steps')
      return { ok: false, error: 'LangDB response invalid', raw: data }
    }

    const outputTokens = estimateTokens(assistantText || '')
    const { costUsd } = calculateCostUsd(inputTokens, outputTokens)
    // Log cost asynchronously
    try { logLangdbCost(opts?.sessionId || 'unknown', model, inputTokens, outputTokens, opts?.requestId) } catch (e) { logger.debug({ err: e }, 'logLangdbCost failed') }

    return { ok: true, steps, meta: { model, inputTokens, outputTokens, costUsd } }
  } catch (e: any) {
    logger.error({ err: e }, 'LangDB call failed')
    return { ok: false, error: e?.message || 'LangDB call failed' }
  }
}


