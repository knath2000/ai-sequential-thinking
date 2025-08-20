import { buildLangdbRequestBody } from '../../../src/providers/langdb/request'

describe('buildLangdbRequestBody', () => {
  it('uses max_completion_tokens for o1/o4 models', () => {
    const body = buildLangdbRequestBody('hello', 'openrouter/o4-mini-high', 12345)
    expect(body.max_completion_tokens).toBeDefined()
    expect(body.max_tokens).toBeUndefined()
  })

  it('uses include_reasoning for anthropic', () => {
    const body = buildLangdbRequestBody('test', 'anthropic/claude-opus-4.1')
    expect(body.include_reasoning).toBe(true)
    expect(body.max_tokens).toBeDefined()
  })

  it('defaults to temperature for standard models', () => {
    const body = buildLangdbRequestBody('hi', 'gpt-4o-mini')
    expect(body.temperature).toBeDefined()
    expect(body.max_tokens).toBeDefined()
  })
})


