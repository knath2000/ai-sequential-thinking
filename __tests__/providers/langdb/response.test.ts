import { extractJsonArrayFromAssistant, getAssistantTextFromResponse } from '../../../src/providers/langdb/response'

describe('response helpers', () => {
  test('strip fenced and parse array', () => {
    const text = '```json\n[{"step_description":"a","progress_pct":10}]\n```'
    const arr = extractJsonArrayFromAssistant(text)
    expect(arr).toBeDefined()
    expect(arr && arr.length).toBe(1)
  })

  test('getAssistantTextFromResponse openai-like', () => {
    const data = { choices: [{ message: { content: 'hello' } }] }
    const t = getAssistantTextFromResponse(data)
    expect(t).toBe('hello')
  })
})


