import type { FastifyReply, FastifyRequest } from 'fastify';

export async function sequentialHandler(req: FastifyRequest, reply: FastifyReply) {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  const query = (req.query as any)?.query ?? '';

  const keepAliveMs = Number(process.env.KEEPALIVE_MS || 15000);
  const interval = setInterval(() => {
    reply.raw.write(`event: ping\n`);
    reply.raw.write(`data: ${Date.now()}\n\n`);
  }, keepAliveMs);

  function sendEvent(event: string, data: unknown) {
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  sendEvent('step_update', { step_description: 'Starting sequential thinking run', progress_pct: 0, query });

  // TODO: wire callClaude + perplexityAsk and stream real updates

  sendEvent('complete', { final_summary: 'Scaffold in place. Implement orchestration next.' });
  clearInterval(interval);
  reply.raw.end();
}


