import { getEffectiveModel } from '../../config'

export function buildLangdbRequestBody(prompt: string, model: string, maxOutputTokens = 50000) {
  const effectiveModel = getEffectiveModel(model)
  const body: any = {
    model: effectiveModel,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  }

  const safeMax = Math.min(maxOutputTokens, 100_000)

  if (effectiveModel.includes('o4-mini') || effectiveModel.includes('o1-')) {
    body.max_completion_tokens = safeMax
  } else if (effectiveModel.startsWith('anthropic/')) {
    body.max_tokens = safeMax
    body.include_reasoning = true
  } else {
    body.max_tokens = safeMax
    body.temperature = 0.2
  }

  return body
}


