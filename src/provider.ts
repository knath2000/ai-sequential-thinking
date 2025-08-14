export type Provider = 'claude' | 'openai' | 'gemini' | 'deepseek'

export interface ProviderConfig {
  provider: Provider
  model: string
}

export function getProviderConfig(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'claude').toLowerCase() as Provider
  // Choose a reasonable default model label per provider (placeholder)
  const defaultModelMap: Record<Provider, string> = {
    claude: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',
    openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-r1',
  }
  return { provider, model: defaultModelMap[provider] }
}

export interface ThinkingStep {
  step_description: string
  progress_pct: number
}

// Stub generator to be replaced by actual provider calls
export async function generateThinkingSteps(query: string): Promise<{ steps: ThinkingStep[]; provider: Provider; model: string; source: 'langdb' | 'stub' }> {
  const { provider, model } = getProviderConfig()

  // Baseline steps (also used if LangDB returns non-parsable content)
  const base: ThinkingStep[] = [
    { step_description: 'Analyzing input', progress_pct: 20 },
    { step_description: 'Planning steps', progress_pct: 45 },
    { step_description: 'Synthesizing answer', progress_pct: 80 },
  ]

  // Try LangDB if configured
  try {
    const { callLangdbChatForSteps } = await import('./providers/langdbClient')
    const res = await callLangdbChatForSteps(query, model)
    if (res.ok) {
      const steps = res.steps && res.steps.length > 0 ? res.steps : base
      return { steps, provider, model, source: 'langdb' }
    }
  } catch {}

  void query
  return { steps: base, provider, model, source: 'stub' }
}


