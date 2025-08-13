import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sequentialHandler } from './sequentialTool';
import { addThought, clearHistory, generateSummary } from './progress';
import type { ThoughtInput } from './types';
import crypto from 'crypto';
import { submitModalJob } from './mcpTools/modalClient';

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


