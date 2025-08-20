import { buildChatUrl } from '../../../src/providers/langdb/urlBuilder'

describe('buildChatUrl', () => {
  const OLD = process.env
  afterEach(() => { process.env = { ...OLD } })

  it('returns empty when no config', () => {
    delete process.env.LANGDB_CHAT_URL
    delete process.env.LANGDB_ENDPOINT
    delete process.env.AI_GATEWAY_URL
    process.env = { }
    const v = buildChatUrl()
    expect(v).toBe('')
  })

  it('uses explicit LANGDB_CHAT_URL when set', () => {
    process.env.LANGDB_CHAT_URL = 'https://custom.langdb.ai/v1/chat/completions'
    const v = buildChatUrl()
    expect(v).toBe('https://custom.langdb.ai/v1/chat/completions')
  })

  it('appends chat/completions for base urls', () => {
    process.env.LANGDB_ENDPOINT = 'https://api.langdb.ai'
    const v = buildChatUrl()
    expect(v).toBe('https://api.langdb.ai/v1/chat/completions')
  })
})


