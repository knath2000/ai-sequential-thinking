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
  const { steps, provider, model, source } = await generateThinkingSteps(String(query || ''));
  // If LangDB produced steps, we may want to enrich the first step with recommendations
  try {
    const available = (process.env.AVAILABLE_MCP_TOOLS || 'mcp_perplexity-ask').split(',').map(s => s.trim()).filter(Boolean);
    const { recommendToolsForThought } = await import('./recommender');
    if (steps && steps.length > 0) {
      const first = steps[0];
      const cs = await recommendToolsForThought(first.step_description || query, available);
      // attach recommended_tools to first step if present
      (first as any).recommended_tools = cs.recommended_tools;
    }
  } catch (e) {
    // ignore recommender errors for SSE
  }
  for (const s of steps) {
    await new Promise((r) => setTimeout(r, 200));
    sendEvent('step_update', s);
  }
  await new Promise((r) => setTimeout(r, 150));
  sendEvent('complete', { final_summary: `Sequential run complete. Provider=${provider}, Model=${model}, Source=${source}` });
  clearInterval(interval);
  reply.raw.end();
}


