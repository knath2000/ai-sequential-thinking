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


