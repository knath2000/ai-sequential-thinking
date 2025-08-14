import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';
import { getProviderConfig } from './provider';

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

  // Actively attempt a LangDB request to surface status/errors
  app.get('/diag/langdb', async () => {
    const { getProviderConfig } = await import('./provider')
    const { model } = getProviderConfig()
    // Derive endpoint preview similar to client
    const explicit = process.env.LANGDB_CHAT_URL || process.env.LANGDB_ENDPOINT || process.env.AI_GATEWAY_URL
    const base = process.env.LANGDB_BASE_URL
    const endpointDerived = explicit
      ? /\/v1\/chat\/completions(\/?$)/.test(explicit) ? explicit : explicit.replace(/\/$/, '') + (/\/v1$/.test(explicit) ? '/chat/completions' : '/v1/chat/completions')
      : base
        ? base.replace(/\/$/, '') + (/\/v1$/.test(base) ? '/chat/completions' : '/v1/chat/completions')
        : ''
    try {
      const { callLangdbChatForSteps } = await import('./providers/langdbClient')
      const res = await callLangdbChatForSteps('diagnostic', model, Number(process.env.DIAG_LANGDB_TIMEOUT_MS || 8000))
      return {
        ok: res.ok,
        hasSteps: Boolean(res.steps && res.steps.length > 0),
        error: res.error,
        endpointDerivedPreview: endpointDerived ? (endpointDerived.length > 80 ? endpointDerived.slice(0,80) + '…' : endpointDerived) : '',
        effectiveModel: model,
        hasKey: Boolean(process.env.LANGDB_API_KEY || process.env.LANGDB_KEY),
        hasProjectId: Boolean(process.env.LANGDB_PROJECT_ID),
      }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'diag_call_failed', endpointDerivedPreview: endpointDerived, effectiveModel: model }
    }
  })

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
      if (args.use_langdb === true) {
        const correlationId = crypto.randomUUID();
        const { model, provider } = getProviderConfig();
        const modalPayload = {
          kind: 'langdb_chat_steps',
          thought,
          model,
          provider,
          session_id: session,
          correlation_id: correlationId,
          // pass through envs to Modal worker
          langdb_chat_url: process.env.LANGDB_CHAT_URL,
          langdb_endpoint: process.env.LANGDB_ENDPOINT,
          ai_gateway_url: process.env.AI_GATEWAY_URL,
          langdb_base_url: process.env.LANGDB_BASE_URL,
          langdb_api_key: process.env.LANGDB_API_KEY,
          langdb_key: process.env.LANGDB_KEY,
          langdb_project_id: process.env.LANGDB_PROJECT_ID,
        };
        try {
          const job = await submitModalJob({ task: 'langdb_chat_steps', payload: modalPayload, callbackPath: '/webhook/modal' });
          // Register waiter
          const resultPromise = new Promise<unknown>((resolve, reject) => {
            jobWaiters.set(correlationId, { resolve, reject, createdAt: Date.now() });
          });
          const timeoutMs = Number(process.env.MODAL_SYNC_TIMEOUT_MS || 25000);
          const timed = new Promise<undefined>((_r, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
          try {
            const result: any = await Promise.race([resultPromise, timed]);
            addThought(args as ThoughtInput, session);
            const payload: Record<string, unknown> = { ok: true, status: 'recorded', provider, model, source: 'langdb', correlation_id: correlationId, job_id: job?.id || job?.job_id };
            if (result && typeof result === 'object') payload.result = result;
            return sendResult({ content: [{ type: 'text', text: JSON.stringify(payload) }] });
          } catch (e: any) {
            // Timed out – return accepted with polling info
            addThought(args as ThoughtInput, session);
            return sendResult({ content: [{ type: 'text', text: JSON.stringify({ ok: true, status: 'accepted', correlation_id: correlationId, job_id: job?.id || job?.job_id, poll: `/modal/job/${correlationId}` }) }] });
          } finally {
            jobWaiters.delete(correlationId);
          }
        } catch (err: any) {
          return sendError(-32000, 'Failed to submit Modal job', { message: err?.message });
        }
      }

      // Default: record per-step without LangDB
      addThought(args as ThoughtInput, session);
      return sendResult({ content: [{ type: 'text', text: JSON.stringify({ ok: true, status: 'recorded', source: 'stub' }) }] });
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
    const raw = JSON.stringify(req.body || {});
    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (secret && signature !== hmac) {
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const body = (req.body as any) || {};
    const correlationId = body?.payload?.correlation_id || body?.correlation_id || body?.job_id;
    const result = body?.result ?? body;
    if (correlationId) {
      const waiter = jobWaiters.get(correlationId);
      if (waiter) {
        waiter.resolve(result);
        jobWaiters.delete(correlationId);
      }
      jobResults.set(correlationId, { done: true, result, createdAt: Date.now() });
    }
    return { ok: true };
  });

  app.get('/modal/job/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const id = (req.params as any)?.id as string;
    const item = jobResults.get(id);
    if (!item) return { ok: true, done: false };
    return { ok: true, done: item.done, result: item.result };
  });

  app.get('/diag/net', async () => {
    const dns = require('dns').promises
    const net = require('net')
    const tls = require('tls')
    const https = require('https')
    const axios = require('axios')

    const host = 'api.us-east-1.langdb.ai'
    const port = 443

    const diag: Record<string, unknown> = {
      proxyEnvs: {
        HTTP_PROXY: process.env.HTTP_PROXY,
        HTTPS_PROXY: process.env.HTTPS_PROXY,
        NO_PROXY: process.env.NO_PROXY,
      },
    }

    // DNS resolve4/6
    try {
      diag.resolve4 = await dns.resolve4(host)
    } catch (e) {
      diag.resolve4Error = e.message
    }
    try {
      diag.resolve6 = await dns.resolve6(host)
    } catch (e) {
      diag.resolve6Error = e.message
    }

    // TCP connect timing (IPv4 first IP if resolved)
    if (diag.resolve4?.length) {
      const startTcp = Date.now()
      const socket = net.connect(port, diag.resolve4[0], () => {
        diag.tcpConnect = `connected in ${Date.now() - startTcp}ms`
        socket.end()
      })
      socket.on('error', (e) => diag.tcpConnectError = e.message)
    }

    // TLS SNI probe
    const startTls = Date.now()
    const tlsSocket = tls.connect({ host, port, servername: host }, () => {
      diag.tlsHandshake = `succeeded in ${Date.now() - startTls}ms`
      tlsSocket.end()
    })
    tlsSocket.on('error', (e) => diag.tlsHandshakeError = e.message)

    // IPv4/IPv6 test fetches
    const httpsAgent4 = new https.Agent({ family: 4, keepAlive: true })
    const httpsAgent6 = new https.Agent({ family: 6, keepAlive: true })
    try {
      const { status } = await axios.get(`https://${host}/v1/models`, { httpsAgent: httpsAgent4, timeout: 3000 })
      diag.ipv4Fetch = `HTTP ${status}`
    } catch (e) {
      diag.ipv4FetchError = e.message
    }
    try {
      const { status } = await axios.get(`https://${host}/v1/models`, { httpsAgent: httpsAgent6, timeout: 3000 })
      diag.ipv6Fetch = `HTTP ${status}`
    } catch (e) {
      diag.ipv6FetchError = e.message
    }

    // KeepAlive test (reuse socket)
    try {
      const startKa = Date.now()
      await axios.get(`https://${host}/v1/models`, { httpsAgent: httpsAgent4, timeout: 3000 })
      const reuseTime = Date.now() - startKa
      diag.keepAliveTest = `reused socket in ${reuseTime}ms`
    } catch (e) {
      diag.keepAliveTestError = e.message
    }

    return diag
  })
}


