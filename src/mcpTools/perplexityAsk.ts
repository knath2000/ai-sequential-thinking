import axios from 'axios'

export interface PerplexityAskResult {
	ok: boolean
	data?: unknown
	error?: string
}

export async function callPerplexityAsk(query: string, endpointOverride?: string): Promise<PerplexityAskResult> {
	const base = endpointOverride || process.env.PERPLEXITY_ASK_URL
	if (!base) {
		return { ok: false, error: 'PERPLEXITY_ASK_URL not configured' }
	}
	try {
		const url = base
		const { data } = await axios.post(url, { query }, { timeout: 15000 })
		return { ok: true, data }
	} catch (error: any) {
		return { ok: false, error: error?.message || 'Perplexity ask failed' }
	}
}


