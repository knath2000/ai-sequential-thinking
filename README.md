# ai-sequential-thinking

An MCP (Model Context Protocol) server that combines sequential thinking with intelligent MCP tool recommendations. It helps break down complex problems into manageable steps and suggests which tools to use at each step with confidence scores and rationales. Designed to work seamlessly with Cursor/Claude MCP over HTTP (JSON-RPC) and SSE, and deployable on Railway with Railway-first environment configuration.

<a href="https://glama.ai/mcp/servers/zl990kfusy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/zl990kfusy/badge" />
</a>

## Features

- 🤔 Dynamic, reflective problem-solving via sequential thoughts
- 🔄 Flexible thinking that adapts and evolves over time
- 🌳 Support for branching and revising prior thoughts
- 🛠️ LLM-driven intelligent tool recommendations for each step
- 📊 Confidence scoring and clear rationale for tool suggestions
- 📝 Step tracking with expected outcomes and conditions
- 🔄 Progress monitoring: previous and remaining steps
- 🧠 Memory management with configurable history limits (`MAX_HISTORY_SIZE`)
- 🧩 Cursor- and MCP-compatible responses (wrapped in `content[]`)
- 🧪 Diagnostics endpoints (`/diag`, `/diag/langdb`, `/routes`) for quick validation

## How It Works

This server facilitates sequential thinking and coordinates MCP tool usage. The LLM evaluates available tools and proposes which to use per step. The server tracks recommendations, maintains context across steps, and enforces guardrails (rate limits, input caps, structured errors).

Workflow overview:
1. Client (Cursor) lists available MCP tools
2. Server receives a thought step; LLM (or heuristic) recommends tools
3. Server records state, manages memory, and returns structured guidance
4. Client executes recommended tools and continues with the next step

Each recommendation typically includes:
- `confidence` (0–1)
- `rationale` explaining why the tool is helpful
- `priority` suggesting execution order
- Optional `suggested_params`

## Example Output

When `USE_ENHANCED_SCHEMA=true` (default), the tool returns a richer structure like:

```json
{
  "thought": "Initial research step to understand X",
  "current_step": {
    "step_description": "Gather initial information",
    "expected_outcome": "Clear understanding",
    "recommended_tools": [
      { "tool_name": "mcp_perplexity-ask", "confidence": 0.9, "rationale": "Search authoritative sources", "priority": 1 }
    ],
    "next_step_conditions": ["Verify accuracy"]
  },
  "previous_steps": [],
  "remaining_steps": [],
  "thought_number": 1,
  "total_thoughts": 5,
  "next_thought_needed": true
}
```

If enhanced schema is disabled, the server returns minimal per-step metadata aligned with agent-driven chaining.

## Configuration (Cursor MCP)

Use a remote configuration so no local server is required. Keep secrets in Railway; do not put LangDB credentials in `mcp.json`.

Project-level (`.cursor/mcp.json`) or global (`~/.cursor/mcp.json`) example:

```json
{
  "mcpServers": {
    "ai-sequential-thinking": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://ai-sequential-thinking-production.up.railway.app"],
      "env": {
        "NODE_ENV": "production",
        "USER_MODEL": "openrouter/o4-mini-high",
        "MAX_HISTORY_SIZE": "1000"
      }
    }
  }
}
```

Notes:
- Remove duplicate LangDB creds from `mcp.json`. Railway holds `LANGDB_*` secrets.
- `USER_MODEL` lets the user override the default model without exposing credentials.
- The server gives Railway env precedence and falls back to `USER_MODEL`/defaults.

## API (MCP Tool)

Tool name: `sequential_thinking`

Parameters (superset; not all are required at once):
- `thought` (string, required): Current thinking step
- `next_thought_needed` (boolean, required)
- `thought_number` (number, required)
- `total_thoughts` (number, required)
- `is_revision` (boolean, optional)
- `revises_thought` (number, optional)
- `branch_from_thought` (number, optional)
- `branch_id` (string, optional)
- `needs_more_thoughts` (boolean, optional)
- `session_id` (string, optional)
- Enhanced schema fields (server-produced): `current_step`, `previous_steps`, `remaining_steps`

Server behavior:
- Minimal per-step returns when enhanced schema is off (agent drives chaining)
- Enhanced structured output when `USE_ENHANCED_SCHEMA=true`

## Railway‑First Environment

The server reads environment from Railway first, then standard env, then user overrides:

Model precedence:
1. Railway/`LANGDB_*` and server defaults
2. `USER_MODEL` from client `mcp.json` (optional override)
3. Fallback to a sensible default (e.g., `openrouter/o4-mini-high`)

Do not include `LANGDB_*` credentials in `mcp.json`. Keep them in Railway.

## HTTP Endpoints

Public endpoints (for diagnostics and demos):
- `GET /health` → `{ ok: true }`
- `GET /capabilities` → advertised tools
- `GET /server-info` → name/version/transports
- `GET /sequential` → SSE demo (streams stubbed steps)
- `GET /` and `GET /sse` → SSE (compat paths)
- `POST /` → JSON-RPC 2.0 root (MCP streamable HTTP)
- `POST /process_thought` → record a thought (REST helper)
- `GET /generate_summary` → derive summary from recorded thoughts
- `POST /clear_history` → clear session history
- `POST /run` → minimal wrapper to record a thought
- `POST /diag/langdb` → actively probe LangDB (POST JSON)
- `GET /diag/langdb` → usage hint (use POST)
- `GET /diag` → non-secret env preview
- `GET /routes` → print registered routes (debug)
- `POST /modal/submit`, `POST /webhook/modal`, `GET /modal/job/:id` → async offload plumbing

### Diagnostics

POST example (Railway defaults):
```bash
curl -X POST https://<railway-app>/diag/langdb \
  -H 'Content-Type: application/json' \
  -d '{}'
```

POST with user override:
```bash
curl -X POST https://<railway-app>/diag/langdb \
  -H 'Content-Type: application/json' \
  -d '{"use_user_model":true}'
```

GET hint:
```bash
curl https://<railway-app>/diag/langdb
```

## Guardrails

- Simple in-memory rate limiting per session/IP (window/max via env)
- Input length caps (e.g., `MAX_THOUGHT_LENGTH`)
- Structured error envelopes for consistent client handling

## Development

### Requirements
- Node.js >= 18, pnpm

### Install & Run
```bash
pnpm i
pnpm dev
```

### Build & Start
```bash
pnpm typecheck
pnpm build
pnpm start
```

## Design & Architecture

- Fastify HTTP with SSE endpoints and JSON-RPC 2.0 root for MCP streamable HTTP
- In-memory state for recorded thoughts; summary derivation
- Minimal per-step (agent-chained) vs. enhanced structured outputs
- Provider/model selection via env with Railway-first precedence and optional `USER_MODEL`
- Modal offload for long-running calls with HMAC-signed callbacks

Key files:
- `src/index.ts` → bootstrap, env load, Fastify startup
- `src/router.ts` → routes (health, SSE, JSON-RPC, diagnostics, Modal webhook)
- `src/sequentialTool.ts` → SSE handler (streams provider stub steps)
- `src/progress.ts` → in-memory store and summary generation
- `src/provider.ts` → provider/model config and step generation stub
- `src/mcpTools/perplexityAsk.ts` → outbound helper (optional)
- `src/mcpTools/modalClient.ts` → Modal job submit helper (optional)
- `src/providers/langdbClient.ts` → LangDB client w/ Railway-first config
- `src/config.ts` → Railway-first env precedence & `USER_MODEL` override

## Memory Management

- History limit via `MAX_HISTORY_SIZE` (default 1000)
- Automatic trimming when limits are exceeded
- Manual cleanup via `POST /clear_history`

Example (Cursor `mcp.json`):
```json
{
  "mcpServers": {
    "ai-sequential-thinking": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://ai-sequential-thinking-production.up.railway.app"],
      "env": { "MAX_HISTORY_SIZE": "500" }
    }
  }
}
```

## Security & Deployment

- Never commit secrets; keep LangDB creds in Railway
- Prefer HTTPS; set `PUBLIC_BASE_URL` in Railway for Modal callbacks
- Consider body size/timeouts of proxies to match `/diag/langdb` 30s client timeout

## Contributing

Contributions are welcome! Feel free to open issues or PRs.

## License

MIT

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

### Enhanced Sequential Thinking Schema

When `USE_ENHANCED_SCHEMA=true` (default), the `sequential_thinking` tool returns a richer JSON structure wrapped in `content[]` for Cursor compatibility. Example:

```json
{
  "thought": "Initial research step to understand X",
  "thought_number": 1,
  "total_thoughts": 5,
  "next_thought_needed": true,
  "current_step": {
    "step_description": "Gather initial information",
    "expected_outcome": "Clear understanding",
    "recommended_tools": [
      { "tool_name": "mcp_perplexity-ask", "confidence": 0.9, "rationale": "Search authoritative sources", "priority": 1 }
    ],
    "next_step_conditions": ["Verify accuracy"]
  },
  "previous_steps": [],
  "remaining_steps": []
}
```

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
