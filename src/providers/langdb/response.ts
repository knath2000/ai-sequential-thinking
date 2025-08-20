import logger from '../../utils/logger'

export interface LangdbStep { step_description: string; progress_pct: number }

function stripFencedBlock(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    const last = t.lastIndexOf('```')
    if (last > 0) {
      const firstNl = t.indexOf('\n')
      if (firstNl !== -1) t = t.slice(firstNl + 1, last).trim()
    }
  }
  return t
}

export function extractJsonArrayFromAssistant(text: string): LangdbStep[] | undefined {
  try {
    if (!text) return undefined
    const stripped = stripFencedBlock(text)
    // Try regex JSON array
    const arrMatch = stripped.match(/\[[\s\S]*?\]/)
    if (arrMatch && arrMatch[0]) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        logger.debug({ err: e }, 'Failed to parse JSON array from assistant content')
      }
    }
    const start = stripped.indexOf('[')
    const end = stripped.lastIndexOf(']')
    if (start >= 0 && end > start) {
      const slice = stripped.slice(start, end + 1)
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    logger.debug({ err: e }, 'extractJsonArrayFromAssistant failure')
  }
  return undefined
}

export function getAssistantTextFromResponse(data: any): string | undefined {
  if (!data) return undefined
  if (data.choices?.[0]?.message?.content) return String(data.choices[0].message.content)
  if (data.choices?.[0]?.text) return String(data.choices[0].text)
  try {
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.content) {
          if (typeof item.content === 'string') return item.content
          if (Array.isArray(item.content) && item.content[0]?.text) return item.content[0].text
        }
      }
    }
  } catch (e) {
    logger.debug({ err: e }, 'getAssistantTextFromResponse error')
  }
  try { return JSON.stringify(data) } catch { return undefined }
}


