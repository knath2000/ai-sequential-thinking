import httpClient from '../utils/httpClient'
import logger from '../utils/logger'

export interface PerplexityAskResult {
	ok: boolean
	data?: unknown
	error?: { message: string; code?: string; status?: number }
	requestId?: string
}

export async function callPerplexityAsk(query: string, endpointOverride?: string, signal?: AbortSignal): Promise<PerplexityAskResult> {
	const base = endpointOverride || process.env.PERPLEXITY_ASK_URL
	if (!base) {
		return { ok: false, error: { message: 'PERPLEXITY_ASK_URL not configured' } }
	}

	const url = base
	const start = Date.now()
	try {
		const res = await httpClient.post(url, { query }, { signal })
		const elapsed = Date.now() - start
		logger.info({ url, elapsed }, 'perplexityAsk success')
		return { ok: true, data: res.data, requestId: (res.headers as any)?.['x-request-id'] }
	} catch (e: any) {
		logger.error({ err: e, url }, 'perplexityAsk failed')
		const err = (e && typeof e === 'object' && 'message' in e) ? { message: e.message, status: (e.status as number | undefined) } : { message: String(e) }
		return { ok: false, error: err }
	}
}


