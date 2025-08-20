import { analyticsClient } from '../../services/analyticsClient'
import logger from '../../utils/logger'

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

export function calculateCostUsd(inputTokens: number, outputTokens: number): { totalTokens: number; costUsd: number } {
  const total = inputTokens + outputTokens
  const pricePer1K = parseFloat(process.env.LANGDB_PRICE_PER_1K || '0.03')
  const costUsd = Number(((total / 1000) * pricePer1K).toFixed(6))
  return { totalTokens: total, costUsd }
}

export function logLangdbCost(sessionId: string, model: string, inputTokens: number, outputTokens: number, requestId?: string) {
  try {
    const { totalTokens, costUsd } = calculateCostUsd(inputTokens, outputTokens)
    analyticsClient.logLangDBCost(sessionId || 'unknown', model, totalTokens, costUsd, requestId, { inputTokens, outputTokens })
    logger.info({ sessionId, requestId, totalTokens, costUsd }, 'Logged LangDB cost')
  } catch (e) {
    logger.warn({ err: e }, 'Failed to log LangDB cost')
  }
}


