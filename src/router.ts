import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';
import { callPerplexityAsk } from './mcpTools/perplexityAsk';

export function setupRoutes(app: FastifyInstance) {
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

      if (args.auto === true) {
        const steps: any[] = [];
        const maxSteps = Number(args.max_steps || args.total_thoughts || 3);
        let thoughtNumber = Number(args.thought_number) || 1;
        for (let i = 0; i < maxSteps; i++) {
          const thoughtArgs = {
            ...args,
            thought_number: thoughtNumber,
            next_thought_needed: i < maxSteps - 1,
          } as ThoughtInput & Record<string, any>
          const entry = addThought(thoughtArgs, session)

          if (args.use_perplexity) {
            const enrich = await callPerplexityAsk(String(thoughtArgs.thought), args.perplexity_endpoint)
            steps.push({ entry, perplexity: enrich })
          } else {
            steps.push({ entry })
          }

          thoughtNumber += 1
        }
        const summary = `Auto-orchestrated ${steps.length} steps.`
        return sendResult({ summary, steps })
      }

      const entry = addThought(args as ThoughtInput, session);
      return sendResult({ content: [{ type: 'text', text: JSON.stringify({ ok: true, entry }) }] });
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
      return reply.code(400).send({ error: 'Invalid input' });
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
    const body = (req.body as any) || {};
    const tool = body.tool || body.name;
    const args = body.arguments || body.args || {};
    if (tool !== 'sequential_thinking') {
      return reply.code(400).send({ error: 'Unsupported tool' });
    }
    // Minimal mapping: route to process_thought semantics
    const session = (req.headers['x-session-id'] as string) || (req.query as any)?.session_id || args.session_id;
    const required = ['thought', 'thought_number', 'total_thoughts', 'next_thought_needed'];
    for (const k of required) {
      if (!(k in args)) return reply.code(400).send({ error: `Missing argument: ${k}` });
    }
    const entry = addThought(args as ThoughtInput, session);
    return { ok: true, result: { entry } };
  });

  // Submit a GPU-heavy job to Modal (async pattern)
  app.post('/modal/submit', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const task = body.task;
    const payload = body.payload || {};
    if (!task) return reply.code(400).send({ error: 'Missing task' });
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


