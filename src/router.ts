import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';

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

      addThought(args as ThoughtInput, session);
      // Return minimal per-step shape; the Agent controls chaining
      return sendResult({ content: [{ type: 'text', text: JSON.stringify({ ok: true, status: 'recorded' }) }] });
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

    // Broadcast event to any listening SSE client if desired
    // For now, just ack and rely on clients to refresh/stream
    return { ok: true };
  });
}


