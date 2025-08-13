import type { FastifyReply, FastifyRequest } from 'fastify';
import { generateThinkingSteps } from './provider';

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

  // Fetch provider-configured steps (stubbed for now)
  const { steps, provider, model } = await generateThinkingSteps(String(query || ''));
  for (const s of steps) {
    await new Promise((r) => setTimeout(r, 200));
    sendEvent('step_update', s);
  }
  await new Promise((r) => setTimeout(r, 150));
  sendEvent('complete', { final_summary: `Sequential run complete. Provider=${provider}, Model=${model}` });
  clearInterval(interval);
  reply.raw.end();
}


