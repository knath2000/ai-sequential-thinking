import { getLangDBConfig } from '../../config'

export function buildChatUrl(): string {
  const chatPath = '/v1/chat/completions'
  const cfg = getLangDBConfig()
  const explicitRaw = process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL || ''
  const pid = cfg.projectId || ''

  if (explicitRaw && explicitRaw.length) {
    let explicit = explicitRaw.replace(/\/$/, '')
    if (explicit.endsWith(chatPath)) return explicit
    if (explicit.endsWith('/v1')) {
      if (pid && !explicit.includes(`/${pid}/`)) explicit = explicit.replace('/v1', `/${pid}/v1`)
      return explicit + '/chat/completions'
    }
    if (pid && !explicit.includes(`/${pid}/`)) explicit = explicit.replace(/\/$/, '') + `/${pid}`
    return explicit + chatPath
  }

  const baseRaw = (cfg.baseUrl || '').replace(/\/$/, '')
  if (!baseRaw) return ''
  if (pid && !baseRaw.includes(`/${pid}/`)) {
    if (baseRaw.endsWith('/v1')) return `${baseRaw.replace('/v1', `/${pid}/v1`)}/chat/completions`
    return `${baseRaw}/${pid}${chatPath}`
  }
  if (baseRaw.endsWith('/v1')) return baseRaw + '/chat/completions'
  return `${baseRaw}${chatPath}`
}


