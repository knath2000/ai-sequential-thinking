import { estimateTokens, calculateCostUsd } from '../../../src/providers/langdb/cost'

describe('cost helpers', () => {
  test('estimate tokens', () => {
    const tokens = estimateTokens('abcd'.repeat(10))
    expect(tokens).toBeGreaterThan(0)
  })

  test('calculate cost uses env price', () => {
    const OLD = process.env
    process.env = { ...OLD, LANGDB_PRICE_PER_1K: '0.05' }
    const { totalTokens, costUsd } = calculateCostUsd(100, 50)
    expect(totalTokens).toBe(150)
    expect(costUsd).toBeCloseTo((150/1000)*0.05, 6)
    process.env = OLD
  })
})


