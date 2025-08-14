import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';
import { getProviderConfig } from './provider';
import { callLangdbChatForSteps } from './providers/langdbClient';

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
  app.get('/diag/langdb', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await callLangdbChatForSteps('test', 'gpt-4o', 8000);
      if (result.ok && Array.isArray(result.steps)) {
        return reply.send({ ok: true, hasSteps: result.steps.length > 0, steps: result.steps });
      } else {
        return reply.send({ ok: false, hasSteps: false, error: 'LangDB response invalid' });
      }
    } catch (e) {
      let errorMessage = 'Unknown error';
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
        errorMessage = (e as { message: string }).message;
      }
      return reply.send({ ok: false, hasSteps: false, error: `LangDB error: ${errorMessage}` });
    }
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
          const modalPayload = {
            ...args,
            langdb_api_key: process.env.LANGDB_API_KEY || process.env.LANGDB_KEY,
            langdb_project_id: process.env.LANGDB_PROJECT_ID,
            langdb_chat_url: derivedLangdbUrl,
            // Enforce model fallback to LANGDB_MODEL or gpt-4o and prevent caller overrides
            model: process.env.LANGDB_MODEL || 'gpt-4o',
          };
          // Debug log to aid diagnosing incorrect endpoints/models in deployed logs
          console.info('[router] submitting Modal job', { derivedLangdbUrl: derivedLangdbUrl?.slice(0, 120), model: modalPayload.model });

          const result = await submitModalJob({
            task: 'langdb_chat_steps',
            payload: modalPayload,
            callbackPath: '/webhook/modal',
            correlationId,
            syncWaitMs: Number(process.env.MODAL_SYNC_TIMEOUT_MS || 25000),
          });

          return sendResult({
            ok: true,
            status: result.status,
            correlation_id: correlationId,
            job_id: correlationId,
            poll: `/modal/job/${correlationId}`
          });
        } catch (e) {
          let errorMessage = 'Failed to submit Modal job';
          if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
            errorMessage = (e as { message: string }).message;
          }
          return sendError(-32000, `Failed to submit Modal job: ${errorMessage}`);
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


