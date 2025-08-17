import axios from 'axios';

export interface SubmitModalJobArgs {
  task: string;
  payload: Record<string, unknown>;
  callbackPath: string; // e.g. '/webhook/modal'
  correlationId?: string;
  /**
   * If provided, the caller intends to wait synchronously for up to this many ms
   * for the Modal job to finish. This library currently passes the value through
   * to the Modal submit endpoint but leaves the actual polling/waiting logic to
   * the caller.
   */
  syncWaitMs?: number;
}

export async function submitModalJob({ task, payload, callbackPath, correlationId, syncWaitMs }: SubmitModalJobArgs) {
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!publicBaseUrl) throw new Error('Missing PUBLIC_BASE_URL');
  const callback_url = new URL(callbackPath, publicBaseUrl).toString();

  // Prefer calling our Modal web endpoint directly if provided
  const submitUrl = process.env.MODAL_SUBMIT_URL;
  const webhookSecret = process.env.MODAL_WEBHOOK_SECRET;
  if (submitUrl) {
    const { data } = await axios.post(submitUrl, {
      task,
      payload,
      callback_url,
      webhook_secret: webhookSecret,
      correlation_id: correlationId,
      sync_wait_ms: syncWaitMs,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });
    if (data?.ok !== true) {
      throw new Error(`Modal submit endpoint error: ${typeof data === 'object' ? JSON.stringify(data) : String(data)}`);
    }
    // Attempt to log a Modal cost event if the submit endpoint returned pricing info
    try {
      const tokens = data?.meta?.tokens_used || undefined;
      const cost = data?.meta?.cost_usd || undefined;
      // analyticsClient is imported lazily to avoid circular imports
      const { analyticsClient } = await import('../services/analyticsClient');
      if (cost !== undefined) {
        const sessionId = payload && (payload as any).session_id ? String((payload as any).session_id) : 'unknown';
        analyticsClient.logModalCost(sessionId, 'job_submission', tokens, cost, correlationId, { task });
      }
    } catch (e) {
      console.warn('[modalClient] failed to log cost from submit response', e);
    }

    return { id: correlationId || (payload?.['correlation_id'] as string | undefined) };
  }

  // Fallback: call Modal API directly (requires token and appropriate API support)
  const baseUrl = process.env.MODAL_BASE_URL || 'https://api.modal.run';
  const token = process.env.MODAL_API_TOKEN;
  if (!token) throw new Error('Missing MODAL_API_TOKEN');
  const url = `${baseUrl}/v1/jobs`;
  const { data } = await axios.post(url, {
    task,
    payload,
    callback_url,
    webhook_secret: webhookSecret,
    correlation_id: correlationId,
    sync_wait_ms: syncWaitMs,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
    validateStatus: () => true,
  });
  if (!data || (data.status && data.status !== 'ok')) {
    throw new Error(`Modal API error: ${typeof data === 'object' ? JSON.stringify(data) : String(data)}`);
  }
  return data;
}

export function buildModalPayloadForLangdb(args: any) {
  // Normalize and enforce model and langdb keys for Modal offload
  const derivedLangdbUrl = (process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL || process.env.LANGDB_BASE_URL) || '';
  const payload = {
    ...args,
    langdb_api_key: process.env.LANGDB_API_KEY || process.env.LANGDB_KEY,
    langdb_project_id: process.env.LANGDB_PROJECT_ID,
    langdb_chat_url: derivedLangdbUrl,
    // Prefer explicit caller model, then env; fallback to a sane high-quality default
    model: (args && args.model) || process.env.LANGDB_MODEL || 'anthropic/claude-opus-4.1',
  };
  return payload;
}


