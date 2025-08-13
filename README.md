# ai-sequential-thinking

AI-driven Model Context Protocol (MCP) server that provides a structured, step-by-step reasoning tool (`sequential_thinking`). Built with Fastify, exposes Server-Sent Events (SSE) for live updates and a JSON-RPC 2.0 endpoint compatible with MCP streamable HTTP transports. Designed to run locally and integrate seamlessly with Cursor/Claude MCP.

## Features
- Sequential thinking tool with minimal per-step responses (Agent controls chaining)
- HTTP JSON-RPC endpoint implementing `initialize`, `tools/list`, `tools/call`
- SSE stream endpoint for demo/observability
- Guardrails: simple rate limiting, input size caps, structured errors
- Provider/model stub via env (future: wire Claude/OpenAI/Gemini/DeepSeek)
- Outbound integrations scaffolded (Perplexity Ask, Modal webhook)

## Requirements
- Node.js >= 18
- pnpm (recommended)

## Installation
```bash
# Clone
git clone https://github.com/knath2000/ai-sequential-thinking.git
cd ai-sequential-thinking

# Install deps
pnpm i
```

## Configuration (.env)
Create a `.env` at the project root (optional; sensible defaults used when omitted):
```bash
# Server
PORT=3000
TRANSPORT=sse               # sse | stdio (stdio is a placeholder)
KEEPALIVE_MS=15000

# Guardrails
RATE_LIMIT_WINDOW_MS=60000  # 1 minute window
RATE_LIMIT_MAX=60           # max requests per window per session/IP
MAX_THOUGHT_LENGTH=2000     # max characters for `thought`

# Provider stub
AI_PROVIDER=claude          # claude | openai | gemini | deepseek
CLAUDE_MODEL=claude-3-5-sonnet-latest
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-2.0-flash
DEEPSEEK_MODEL=deepseek-r1

# Optional integrations
PERPLEXITY_ASK_URL=http://localhost:5050/ask
MODAL_BASE_URL=https://api.modal.run
MODAL_API_TOKEN=...         # required to submit Modal jobs
PUBLIC_BASE_URL=http://localhost:3000
MODAL_WEBHOOK_SECRET=...    # used to verify /webhook/modal
```

## Running
```bash
# Dev (ts-node)
pnpm dev

# Type-check and build
pnpm typecheck
pnpm build

# Start compiled server
pnpm start
```

## Endpoints
- GET `/health` → `{ ok: true }`
- GET `/capabilities` → advertised tools
- GET `/server-info` → server metadata (name/version/transports)
- GET `/sequential` → SSE stream demo
- GET `/` and `/sse` → SSE (for clients that probe these paths)
- POST `/` → JSON-RPC 2.0 root (MCP streamable HTTP)
- POST `/process_thought` → record one thought (REST helper)
- GET `/generate_summary` → derive basic summary from recorded thoughts
- POST `/clear_history` → clear session history
- POST `/run` → minimal wrapper to record a thought
- POST `/modal/submit` and `/webhook/modal` → Modal async job plumbing

### SSE quick test
```bash
curl -N http://localhost:3000/sequential?query=hello
```

### JSON-RPC examples
- Initialize
```bash
curl -sS -X POST localhost:3000/ \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

- List tools
```bash
curl -sS -X POST localhost:3000/ \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

- Call `sequential_thinking` (per-step minimal return)
```bash
curl -sS -X POST localhost:3000/ \
  -H 'Content-Type: application/json' \
  --data '{
    "jsonrpc":"2.0","id":3,
    "method":"tools/call",
    "params":{
      "name":"sequential_thinking",
      "arguments":{
        "thought":"Map the problem and identify data hotspots",
        "thought_number":1,
        "total_thoughts":3,
        "next_thought_needed":true
      }
    }
  }'
```
Expected JSON-RPC result content contains `{ ok: true, status: "recorded" }`.

## Using with Cursor MCP
1) Ensure the server is running locally (see Running).
2) In Cursor, open Settings → Features → MCP and activate your `ai-sequential-thinking` server entry.
3) In a chat (Act mode), issue sequential tool calls, for example:
```json
{
  "thought": "Map the problem and identify data hotspots",
  "thought_number": 1,
  "total_thoughts": 3,
  "next_thought_needed": true
}
```
Repeat for steps 2 and 3. Each call returns a minimal recorded status; the Agent drives chaining.

## Design & Architecture
- Fastify server with SSE endpoints and JSON-RPC 2.0 root for MCP streamable HTTP
- In-memory state for recorded thoughts; basic summary derivation
- Minimal per-step tool result to align with Agent-driven follow-ups
- Provider/model selection via env; current steps streamed via stub provider
- Guardrails: rate limit per session/IP; input length caps; structured error payloads

Key files:
- `src/index.ts` → bootstrap, env load, Fastify startup
- `src/router.ts` → routes (health, SSE, JSON-RPC, helpers, Modal webhook)
- `src/sequentialTool.ts` → SSE handler (streams provider stub steps)
- `src/progress.ts` → in-memory store and summary generation
- `src/provider.ts` → provider/model config and step generation stub
- `src/mcpTools/perplexityAsk.ts` → outbound call helper (optional)
- `src/mcpTools/modalClient.ts` → Modal job submit helper (optional)

## Testing
- Health:
```bash
curl -sS localhost:3000/health
```
- JSON-RPC flow: see examples above
- Rate limit conditions: hammer an endpoint and expect HTTP 429 with retryAfterMs in payload
- Input size cap: send an overly long `thought` and expect a structured 400 error

## Deployment
- Any Node-capable host works. For Railway/Render/Fly: expose PORT, set `PUBLIC_BASE_URL`, configure Modal webhook secret if used. Ensure long-lived SSE connections are supported by your platform.

## Security & Guardrails
- Do not log secrets. Keep Modal tokens and keys in env/secrets.
- Rate limiting and input caps are minimal; tune via env for your environment.
- Consider adding auth and request signing if exposing publicly.

## Roadmap
- Wire real provider clients (Claude via LangDB, OpenAI, Gemini, DeepSeek)
- Add MCP tool to fetch session summaries (JSON-RPC wrapper for `generate_summary`)
- Persistence layer (pluggable store)
- CI, tests, and container image

## Contributing
1) Fork the repo
2) Create a feature branch: `git checkout -b feature/your-feature`
3) Commit changes: `git commit -m "feat: ..."`
4) Push: `git push origin feature/your-feature`
5) Open a PR

## License
MIT
