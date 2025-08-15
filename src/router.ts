import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary, getThoughts } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';
import { getProviderConfig } from './provider';
import { callLangdbChatForSteps } from './providers/langdbClient';
import { getEffectiveModel } from './config';

export function setupRoutes(app: FastifyInstance) {
  // Simple in-memory rate limiter per key (sessionId or IP)
  const requestsWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const requestsMaxPerWindow = Number(process.env.RATE_LIMIT_MAX || 60);
  const keyToWindow: Map<string, { resetAt: number; count: number }> = new Map();

  function getClientKey(req: FastifyRequest) {
    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id || '';
    const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown').toString();
    return session || ip;
  }

  function checkAndIncrementRateLimit(req: FastifyRequest): { allowed: boolean; retryAfterMs?: number } {
    const key = getClientKey(req);
    const now = Date.now();
    const existing = keyToWindow.get(key);
    if (!existing || existing.resetAt <= now) {
      keyToWindow.set(key, { resetAt: now + requestsWindowMs, count: 1 });
      return { allowed: true };
    }
    if (existing.count < requestsMaxPerWindow) {
      existing.count += 1;
      return { allowed: true };
    }
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  const MAX_THOUGHT_LENGTH = Number(process.env.MAX_THOUGHT_LENGTH || 2000);

  // In-memory Modal orchestration for LangDB offload
  const jobWaiters: Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void; createdAt: number }> = new Map();
  const jobResults: Map<string, { done: boolean; result?: unknown; createdAt: number }> = new Map();

  app.get('/health', async () => ({ ok: true }));

  app.get('/capabilities', async () => ({
    tools: [
      {
        name: 'sequential_thinking',
        description: 'Dynamic, reflective sequential thinking with branching, revisions, and tool recommendations.',
      },
    ],
  }));

  app.get('/sequential', async (req: FastifyRequest, reply: FastifyReply) => {
    return sequentialHandler(req, reply);
  });

  // Server info for MCP remotes
  app.get('/server-info', async () => ({
    name: 'ai-sequential-thinking',
    version: '0.1.0',
    transports: ['http', 'sse'],
    endpoints: {
      http: '/',
      sse: '/sse',
    },
  }));

  // Minimal diagnostics without leaking secrets
  app.get('/diag', async () => {
    const chatUrl = (process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL || process.env.LANGDB_BASE_URL || '') as string
    const preview = chatUrl ? (chatUrl.length > 60 ? chatUrl.slice(0, 60) + '…' : chatUrl) : ''
    return {
      hasLangdbKey: Boolean(process.env.LANGDB_API_KEY || process.env.LANGDB_KEY),
      hasLangdbProjectId: Boolean(process.env.LANGDB_PROJECT_ID),
      hasLangdbUrl: Boolean(chatUrl),
      chatUrlPreview: preview,
      port: process.env.PORT || '3000',
      transport: process.env.TRANSPORT || 'sse',
    }
  })

  // Add interface before the route
  interface DiagLangdbBody {
    model?: string;
    use_modal?: boolean;
    timeout_ms?: number;
    use_user_model?: boolean;
  }

  // Actively attempt a LangDB request to surface status/errors
      app.post('/diag/langdb', async (req: FastifyRequest, reply: FastifyReply) => {
  // Add raw body logging
  const requestBody = req.body as DiagLangdbBody;

  console.log('Raw request body:', requestBody);

  // Validate incoming payload
  if (!requestBody || typeof requestBody !== 'object') {
    console.error('Invalid or empty JSON payload received');
    return reply.status(400).send({
      ok: false,
      error: 'Invalid or empty JSON payload received'
    });
  }

  // Then access properties safely with defaults
  const diagModel = getEffectiveModel(requestBody.model, requestBody.use_user_model === true);
  const useModal = requestBody.use_modal === true;
  const timeout = Number(requestBody.timeout_ms || process.env.LANGDB_TIMEOUT_MS || 30000); // Increased default

  try {
    if (useModal) {
      const correlationId = crypto.randomUUID();
      // Import buildModalPayloadForLangdb from correct path
      const { buildModalPayloadForLangdb } = await import('./mcpTools/modalClient');
      const modalPayload = buildModalPayloadForLangdb({
        thought: 'test',
        model: diagModel,
        timeout: timeout,
      });

      const resultPromise = new Promise((resolve, reject) => {
        jobWaiters.set(correlationId, { resolve, reject, createdAt: Date.now() });
      });

      await submitModalJob({
        task: 'langdb_chat_steps',
        payload: modalPayload,
        callbackPath: '/webhook/modal',
        correlationId,
        syncWaitMs: timeout,
      });

      const result = await Promise.race([
        resultPromise,
        new Promise((_r, reject) => setTimeout(() => reject(new Error('sync_timeout')), timeout)),
      ]);

      return reply.send({
        ok: true,
        model: diagModel,
        timeout_ms: timeout,
        result,
      });
    } else {
      const result = await callLangdbChatForSteps('test', diagModel, timeout);
      return {
        ...result,
        model: diagModel,
        timeout_ms: timeout,
      };
    }
  } catch (e: any) {
    console.error('LangDB processing error:', e);
    console.error('Received payload:', JSON.stringify(requestBody, null, 2));

    return reply.status(500).send({
      ok: false,
      error: e.message || 'LangDB error',
      received: JSON.stringify(requestBody).substring(0, 200) + '...',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

  // GET fallback for browser/manual testing to hint proper usage
  app.get('/diag/langdb', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(405).send({
      ok: true,
      message: 'Use POST method for LangDB diagnostics',
      example: {
        method: 'POST',
        path: '/diag/langdb',
        body: {
          model: 'openrouter/o4-mini-high',
          use_modal: true,
          use_user_model: true,
          timeout_ms: 30000,
        },
      },
    });
  });

  // Route listing endpoint for debugging
  app.get('/routes', async () => {
    // printRoutes returns a string; return it as-is
    const routes = (app as any).printRoutes ? (app as any).printRoutes() : 'printRoutes not available';
    return { routes };
  });

  // Provide SSE on common paths to avoid 404 during probing
  app.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    return sequentialHandler(req, reply);
  });

  app.get('/sse', async (req: FastifyRequest, reply: FastifyReply) => {
    return sequentialHandler(req, reply);
  });

  // JSON-RPC 2.0 endpoint for MCP streamable HTTP transport
  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const limitCheck = checkAndIncrementRateLimit(req);
    if (!limitCheck.allowed) {
      return reply.code(429).send({ jsonrpc: '2.0', error: { code: 429, message: 'Rate limit exceeded', data: { retryAfterMs: limitCheck.retryAfterMs } } });
    }
    const body = (req.body as any) || {};
    const hasId = Object.prototype.hasOwnProperty.call(body, 'id');
    const id = hasId ? body.id : undefined;
    const sendResult = (result: unknown) => reply.send({ jsonrpc: '2.0', id, result });
    const sendError = (code: number, message: string, data?: unknown) => reply.send({ jsonrpc: '2.0', id, error: { code, message, data } });

    if (body?.jsonrpc !== '2.0' || typeof body?.method !== 'string') {
      return sendError(-32600, 'Invalid Request');
    }

    const method = body.method as string;
    const params = (body.params as any) || {};

    // Handle notifications (no id) without responding
    if (!hasId) {
      if (method === 'notifications/initialized') {
        return reply.status(204).send();
      }
      return reply.status(204).send();
    }

    if (method === 'initialize') {
      return sendResult({
        protocolVersion: '2025-06-18',
        serverInfo: { name: 'ai-sequential-thinking', version: '0.1.0' },
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
          logging: {},
          roots: {},
        },
      });
    }

    if (method === 'tools/list') {
      return sendResult({
        tools: [
          {
            name: 'sequential_thinking',
            description: 'Dynamic, reflective sequential thinking with branching, revisions, and tool recommendations.',
            inputSchema: {
              type: 'object',
              properties: {
                thought: { type: 'string' },
                thought_number: { type: 'number' },
                total_thoughts: { type: 'number' },
                next_thought_needed: { type: 'boolean' },
                is_revision: { type: 'boolean' },
                revises_thought: { type: 'number' },
                branch_from_thought: { type: 'number' },
                branch_id: { type: 'string' },
                needs_more_thoughts: { type: 'boolean' },
                session_id: { type: 'string' },
              },
              required: ['thought', 'thought_number', 'total_thoughts', 'next_thought_needed'],
              additionalProperties: true,
            },
          },
        ],
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name || params?.tool;
      const args = params?.arguments || params?.args || {};
      if (toolName !== 'sequential_thinking') {
        return sendError(-32601, 'Tool not found');
      }
      const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id || args.session_id;
      const required = ['thought', 'thought_number', 'total_thoughts', 'next_thought_needed'];
      for (const k of required) {
        if (!(k in args)) return sendError(-32602, `Missing argument: ${k}`);
      }
      const thought = String(args.thought || '');
      if (thought.length > MAX_THOUGHT_LENGTH) {
        return sendError(-32602, 'Thought too long', { maxLength: MAX_THOUGHT_LENGTH });
      }
      // If use_langdb flag is set, offload to Modal and await result (with timeout)
      if (args?.use_langdb === true) {
        try {
          const correlationId = crypto.randomUUID();
          const derivedLangdbUrl = (process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL || process.env.LANGDB_BASE_URL) || '';
          const requestedModel = typeof args.model === 'string' ? args.model : undefined;
          const modalModel = getEffectiveModel(requestedModel, Boolean((args as any).use_user_model));
          const modalPayload = {
            ...args,
            langdb_api_key: process.env.LANGDB_API_KEY || process.env.LANGDB_KEY,
            langdb_project_id: process.env.LANGDB_PROJECT_ID,
            langdb_chat_url: derivedLangdbUrl,
            // Model selection with Railway-first precedence + optional user override
            model: modalModel,
          };
          // Debug log to aid diagnosing incorrect endpoints/models in deployed logs
          console.info('[router] submitting Modal job', { derivedLangdbUrl: derivedLangdbUrl?.slice(0, 120), model: modalPayload.model });

          const syncWait = Number(process.env.MODAL_SYNC_TIMEOUT_MS || 120000);
          console.info('[router] submitModalJob sync wait ms', { correlationId, syncWait });

          // Register waiter for webhook callback
          const resultPromise: Promise<unknown> = new Promise((resolve, reject) => {
            jobWaiters.set(correlationId, { resolve, reject, createdAt: Date.now() });
          });

          let submitRes: any;
          try {
            submitRes = await submitModalJob({
              task: 'langdb_chat_steps',
              payload: modalPayload,
              callbackPath: '/webhook/modal',
              correlationId,
              syncWaitMs: syncWait,
            });

              // Wait for callback or timeout
              const timed = new Promise<undefined>((_r, reject) => setTimeout(() => reject(new Error('sync_timeout')), syncWait));
              try {
                const finalResult = await Promise.race([resultPromise, timed]);
                // webhook returned result within sync window
                console.info('[router] modal job completed within sync window', { correlationId });
                // Mirror sequentialthinking_tools exact shape
                const history = getThoughts(session);
                const out = {
                  thought_number: Number(args.thought_number),
                  total_thoughts: Number(args.total_thoughts),
                  next_thought_needed: Boolean(args.next_thought_needed),
                  branches: [],
                  thought_history_length: Array.isArray(history) ? history.length : 0,
                  available_mcp_tools: ['mcp_perplexity-ask'],
                };
                // Cursor expects displayable content in a `content[]` array for some transports.
                return sendResult({ content: [{ type: 'text', text: JSON.stringify(out) }] });
              } catch (e) {
                // timed out waiting for webhook – return accepted info as content (Cursor-friendly)
                console.info('[router] modal job sync wait timed out, returning accepted', { correlationId });
                // Even on accepted, mirror the expected structure without exposing job details
                const history = getThoughts(session);
                const out = {
                  thought_number: Number(args.thought_number),
                  total_thoughts: Number(args.total_thoughts),
                  next_thought_needed: Boolean(args.next_thought_needed),
                  branches: [],
                  thought_history_length: Array.isArray(history) ? history.length : 0,
                  available_mcp_tools: ['mcp_perplexity-ask'],
                };
                return sendResult({ content: [{ type: 'text', text: JSON.stringify(out) }] });
              }
          } catch (e) {
            let errorMessage = 'Failed to submit Modal job';
            if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
              errorMessage = (e as { message: string }).message;
            }
            return sendError(-32000, `Failed to submit Modal job: ${errorMessage}`);
          } finally {
            // cleanup waiter if still present after sync window
            if (jobWaiters.has(correlationId)) {
              // don't reject; leave to webhook to resolve later
              // but remove to avoid memory leak
              const w = jobWaiters.get(correlationId);
              // we avoid calling reject here to let webhook handle late arrivals
              jobWaiters.delete(correlationId);
              console.info('[router] cleaned up waiter after sync window', { correlationId });
            }
          }
        } catch (e) {
          let errorMessage = 'Failed to submit Modal job';
          if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
            errorMessage = (e as { message: string }).message;
          }
          return sendError(-32000, `Failed to submit Modal job: ${errorMessage}`);
        }
      }

      // Enhanced flow: record per-step, generate recommendations, and return structured output
      addThought(args as ThoughtInput, session);
      // Build enhanced output when USE_ENHANCED_SCHEMA is true
      const useEnhanced = String(process.env.USE_ENHANCED_SCHEMA || 'true').toLowerCase() === 'true';
      const history = getThoughts(session);
      if (useEnhanced) {
        // Generate current_step recommendations
        try {
          const available = (process.env.AVAILABLE_MCP_TOOLS || 'mcp_perplexity-ask').split(',').map(s => s.trim()).filter(Boolean);
          const { recommendToolsForThought } = await import('./recommender');
          const current_step = await recommendToolsForThought(String(args.thought || ''), available);

          const out = {
            thought: String(args.thought || ''),
            thought_number: Number(args.thought_number),
            total_thoughts: Number(args.total_thoughts),
            next_thought_needed: Boolean(args.next_thought_needed),
            current_step,
            previous_steps: history,
            remaining_steps: [],
          };
          return sendResult({ content: [{ type: 'text', text: JSON.stringify(out) }] });
        } catch (e) {
          console.warn('[router] recommender error', e);
          // fallback to minimal shape
        }
      }

      // Fallback minimal shape
      const out = {
        thought_number: Number(args.thought_number),
        total_thoughts: Number(args.total_thoughts),
        next_thought_needed: Boolean(args.next_thought_needed),
        branches: [],
        thought_history_length: Array.isArray(history) ? history.length : 0,
        available_mcp_tools: ['mcp_perplexity-ask'],
      };
      return sendResult({ content: [{ type: 'text', text: JSON.stringify(out) }] });
    }

    if (method === 'prompts/list') {
      return sendResult({ prompts: [] });
    }

    if (method === 'resources/list') {
      return sendResult({ resources: [] });
    }

    return sendError(-32601, 'Method not found');
  });

  app.post('/process_thought', async (req: FastifyRequest, reply: FastifyReply) => {
    const limitCheck = checkAndIncrementRateLimit(req);
    if (!limitCheck.allowed) {
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', details: { retryAfterMs: limitCheck.retryAfterMs } } });
    }
    const body = (req.body as Partial<ThoughtInput> | undefined) || {};
    const {
      thought,
      thought_number,
      total_thoughts,
      next_thought_needed,
      is_revision,
      revises_thought,
      branch_from_thought,
      branch_id,
      needs_more_thoughts,
    } = body as ThoughtInput;

    if (typeof thought !== 'string' || typeof thought_number !== 'number' || typeof total_thoughts !== 'number' || typeof next_thought_needed !== 'boolean') {
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Invalid input' } });
    }
    if (thought.length > MAX_THOUGHT_LENGTH) {
      return reply.code(400).send({ error: { code: 'INPUT_TOO_LONG', message: `Thought exceeds max length ${MAX_THOUGHT_LENGTH}` } });
    }

    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id;
    const entry = addThought({
      thought,
      thought_number,
      total_thoughts,
      next_thought_needed,
      is_revision,
      revises_thought,
      branch_from_thought,
      branch_id,
      needs_more_thoughts,
    }, session);

    return { ok: true, entry };
  });

  app.get('/generate_summary', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id;
    const summary = generateSummary(session);
    return { summary };
  });

  app.post('/clear_history', async (req: FastifyRequest) => {
    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id || (req.body as any)?.session_id;
    clearHistory(session);
    return { ok: true };
  });

  app.post('/run', async (req: FastifyRequest, reply: FastifyReply) => {
    const limitCheck = checkAndIncrementRateLimit(req);
    if (!limitCheck.allowed) {
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', details: { retryAfterMs: limitCheck.retryAfterMs } } });
    }
    const body = (req.body as any) || {};
    const tool = body.tool || body.name;
    const args = body.arguments || body.args || {};
    if (tool !== 'sequential_thinking') {
      return reply.code(400).send({ error: { code: 'UNSUPPORTED_TOOL', message: 'Unsupported tool' } });
    }
    // Minimal mapping: route to process_thought semantics
    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id || args.session_id;
    const required = ['thought', 'thought_number', 'total_thoughts', 'next_thought_needed'];
    for (const k of required) {
      if (!(k in args)) return reply.code(400).send({ error: { code: 'MISSING_ARGUMENT', message: `Missing argument: ${k}` } });
    }
    const thought = String(args.thought || '');
    if (thought.length > MAX_THOUGHT_LENGTH) {
      return reply.code(400).send({ error: { code: 'INPUT_TOO_LONG', message: `Thought exceeds max length ${MAX_THOUGHT_LENGTH}` } });
    }
    const entry = addThought(args as ThoughtInput, session);
    return { ok: true, result: { entry } };
  });

  // Submit a GPU-heavy job to Modal (async pattern)
  app.post('/modal/submit', async (req: FastifyRequest, reply: FastifyReply) => {
    const limitCheck = checkAndIncrementRateLimit(req);
    if (!limitCheck.allowed) {
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', details: { retryAfterMs: limitCheck.retryAfterMs } } });
    }
    const body = (req.body as any) || {};
    const task = body.task;
    const payload = body.payload || {};
    if (!task) return reply.code(400).send({ error: { code: 'MISSING_TASK', message: 'Missing task' } });
    const result = await submitModalJob({ task, payload, callbackPath: '/webhook/modal' });
    return { ok: true, job: result };
  });

  // Webhook receiver for Modal job completion
  app.post('/webhook/modal', async (req: FastifyRequest, reply: FastifyReply) => {
    const secret = process.env.MODAL_WEBHOOK_SECRET || '';
    const signature = (req.headers['x-signature'] as string) || '';
    const body = (req.body as any) || {};
    const raw = JSON.stringify(body || {});
    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    console.info('[webhook] Received callback', { path: '/webhook/modal', signature: !!signature });
    if (secret && signature !== hmac) {
      console.warn('[webhook] Invalid HMAC signature');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    try {
      const correlationId = body?.payload?.correlation_id || body?.correlation_id || body?.job_id;
      const result = body?.result ?? body;

      // Persist result to disk so it survives instance restarts
      const storeDir = process.env.NODE_JOB_RESULTS_DIR || '/tmp/mcp_job_results';
      const fs = await import('fs');
      const path = await import('path');
      try {
        fs.mkdirSync(storeDir, { recursive: true });
      } catch (e) {
        // ignore
      }

      if (correlationId) {
        const waiter = jobWaiters.get(correlationId);
        if (waiter) {
          try { waiter.resolve(result); } catch (e) { console.error('[webhook] waiter.resolve error', e); }
          jobWaiters.delete(correlationId);
        }
        jobResults.set(correlationId, { done: true, result, createdAt: Date.now() });

        const outPath = path.join(storeDir, `${correlationId}.json`);
        try {
          fs.writeFileSync(outPath, JSON.stringify({ done: true, result, ts: Date.now() }), { encoding: 'utf8' });
          console.info('[webhook] persisted job result', { correlationId, outPath });
        } catch (e) {
          console.error('[webhook] failed to persist job result', e);
        }
      } else {
        console.warn('[webhook] callback did not include correlation id', { bodyPreview: raw.slice(0,200) });
      }

      return reply.send({ ok: true });
    } catch (e) {
      console.error('[webhook] error handling callback', e);
      return reply.code(500).send({ ok: false, error: String(e) });
    }
  });

  app.get('/modal/job/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const id = (req.params as any)?.id as string;
    let item = jobResults.get(id);
    if (!item) {
      // Try to read from persistent store
      const storeDir = process.env.NODE_JOB_RESULTS_DIR || '/tmp/mcp_job_results';
      try {
        const path = await import('path');
        const fs = await import('fs');
        const p = path.join(storeDir, `${id}.json`);
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          const newItem = { done: true, result: parsed.result, createdAt: parsed.ts } as { done: boolean; result?: unknown; createdAt: number };
          item = newItem;
          // rehydrate in-memory cache
          jobResults.set(id, newItem);
        }
      } catch (e) {
        console.error('[modal/job] error reading persisted job result', e);
      }
    }
    if (!item) return { ok: true, done: false };
    return { ok: true, done: item.done, result: item.result };
  });

  app.get('/diag/net', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const dns = require('dns');
      const net = require('net');
      const tls = require('tls');
      const https = require('https');

      const results: Record<string, any> = {};

      // DNS resolution
      try {
        const ipv4 = await dns.promises.resolve4('api.us-east-1.langdb.ai');
        results.dns_ipv4 = ipv4;
      } catch (e) {
        results.dns_ipv4_error = e && typeof e === 'object' && 'message' in e ? (e as any).message : 'DNS failed';
      }

      // TCP connectivity
      try {
        const socket = net.createConnection(443, 'api.us-east-1.langdb.ai');
        await new Promise((resolve, reject) => {
          socket.on('connect', resolve);
          socket.on('error', reject);
          setTimeout(() => reject(new Error('TCP timeout')), 5000);
        });
        results.tcp_443 = 'connected';
      } catch (e) {
        results.tcp_443_error = e && typeof e === 'object' && 'message' in e ? (e as any).message : 'TCP failed';
      }

      return reply.send(results);
    } catch (e) {
      let errorMessage = 'Unknown error';
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
        errorMessage = (e as { message: string }).message;
      }
      return reply.send({ error: errorMessage });
    }
  });
}


