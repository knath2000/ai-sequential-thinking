export interface LangdbConfig {
  baseUrl?: string
  apiKey?: string
  projectId?: string
  model: string
}

function fromRailwayOrEnv(key: string): string | undefined {
  return process.env[key] || (process.env as any)[`RAILWAY_${key}`]
}

export function getLangDBConfig(): LangdbConfig {
  const baseUrl = fromRailwayOrEnv('LANGDB_BASE_URL')
  const apiKey = fromRailwayOrEnv('LANGDB_API_KEY') || fromRailwayOrEnv('LANGDB_KEY')
  const projectId = fromRailwayOrEnv('LANGDB_PROJECT_ID')
  const model = process.env.USER_MODEL || process.env.LANGDB_DEFAULT_MODEL || 'openrouter/o4-mini-high'
  return { baseUrl, apiKey, projectId, model }
}

export function getEffectiveModel(requestedModel?: string, useUserModel?: boolean): string {
  const { model: userModel } = getLangDBConfig()
  if (useUserModel) return userModel
  return requestedModel || userModel
}


