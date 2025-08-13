# Tech Context

### Stack
- Node.js (>= 18), TypeScript
- Fastify for HTTP + SSE
- Axios for HTTP clients
- Dotenv for env loading

### Key Env Vars
- `LANGDB_BASEURL` (e.g., https://gateway.langdb.ai)
- `LANGDB_KEY`
- `PERPLEXITY_ASK_URL` (e.g., http://localhost:5000)
- `PORT` (default 3000)
- `TRANSPORT` ("sse" or "stdio")

### Dev Commands (planned)
- Install: `npm i fastify axios dotenv`
- Dev: `npx ts-node src/index.ts`
- Test SSE: `curl -N "http://localhost:3000/sequential?query=..."`
- Build: `tsc`

### Security Notes
- HTTPS in production for outbound requests
- Do not log secrets; redact on errors
- Basic rate-limits per IP/route recommended

### Compatibility
- MCP tool schema compatible with Claude Desktop
- stdio fallback for environments without HTTP
