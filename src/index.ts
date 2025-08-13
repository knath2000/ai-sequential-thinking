import Fastify from 'fastify';
import dotenv from 'dotenv';
import { setupRoutes } from './router';

dotenv.config();

async function main() {
  const transport = process.env.TRANSPORT || 'sse';
  const fastify = Fastify({ logger: true });

  setupRoutes(fastify);

  if (transport === 'stdio') {
    // Placeholder: stdio transport for Claude Desktop MCP
    process.stdin.resume();
    process.stdout.write(JSON.stringify({ status: 'stdio_not_implemented' }) + '\n');
  } else {
    const port = Number(process.env.PORT || 3000);
    const host = '0.0.0.0';
    await fastify.listen({ port, host });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


