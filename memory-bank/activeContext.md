# Active Context

### Current Focus
- Establish repo structure and env scaffolding for the MCP server
- Define Sequential Thinking tool schema and flow
- Wire Claude Opus 4 (LangDB) client wrapper and Perplexity-Ask tool

### Recent Changes
- Initialized memory-bank with core documents
- Captured architecture, modules, and env requirements
- Scaffolded TS Fastify server with SSE + stub stdio
- Added endpoints: `/health`, `/capabilities`, `/sequential`
- Implemented in-memory sequential-thinking state and endpoints:
  - `/process_thought`, `/generate_summary`, `/clear_history`, minimal `/run`
- Implemented JSON-RPC streamable HTTP root (`/`) with methods: `initialize`, `tools/list`, `tools/call`, `notifications/initialized` (204)
- Added `server-info`, `GET /` and `/sse` to stream; fixed 404s
- Deployed Modal GPU app (`mcp_gpu_tasks`), webhook to Railway, HMAC verification
- Pushed repository to GitHub; added Cursor MCP config entry
- Provider switch stub added (`src/provider.ts`) with env-based defaults; SSE streams via provider stub
- Removed `auto`/`auto_chain` paths to align with per-step parity
- Matched protocolVersion to `2025-06-18` and corrected `inputSchema` casing
- Compared behavior with third-party `sequentialthinking-tools`; documented no standard auto-chain field

### Validation (this session)
- Repo pushed to GitHub (`main`)
- In-Cursor test: invoked `sequential_thinking` three times; each returned `{ ok: true, status: "recorded" }`

### Next Steps
1. FINALIZED: Adopted per-step parity with minimal return shape; client (Agent) controls chaining.
2. Implemented: removed auto/auto_chain multi-step paths from JSON-RPC; standardized minimal per-step response.
3. Implemented guardrails: rate limiting (env-tunable), input length caps, structured errors.
4. TODO: Add provider switch (Claude Sonnet/Opus, GPT-4o/o1, Gemini 2.5, DeepSeek R1) and LangDB client wiring.
5. TODO: Railway deploy and end-to-end tests in Cursor Agent mode; document test scripts.

### Decisions & Considerations
- Keep state in-memory initially; add persistence later if needed
- Prefer streamable HTTP via mcp-remote compatibility
- No standard JSON-RPC field to force client follow-up; client (Agent) drives chaining
- Align tool response shape with third-party parity to avoid client confusion
