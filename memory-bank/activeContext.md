# Active Context

### Current Focus
- Establish repo structure and env scaffolding for the MCP server
- Define Sequential Thinking tool schema and flow
- Wire Claude Opus 4 (LangDB) client wrapper and Perplexity-Ask tool
- Ensure Cursor compatibility for MCP tool responses and reliable LangDB offload via Modal

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
 - Implemented diagnostic plan for LangDB endpoint failures
   - Converted `/diag/langdb` from GET to POST for JSON payload handling
   - Added robust validation/logging (raw body logging, empty/invalid payload handling, increased default timeout)
   - Introduced GET fallback for `/diag/langdb` that hints proper POST usage
   - Added `/routes` endpoint to print registered routes for debugging
   - Fixed TypeScript body typing via `DiagLangdbBody` interface
   - Ensured build passes (`pnpm build`) and pushed to GitHub (`main`, commit `03ad2f1`)

# Cursor compatibility + LangDB via Modal (latest)
- Increased synchronous wait window in `src/router.ts` to 120s; Modal function timeout to 1800s in `modal_app.py`.
- Defaulted model to `gpt-4o-mini` for faster completions; simplified system prompt to return only 3 JSON steps.
- Wrapped tool results for `tools/call` in `content[]` with a single `{ type: 'text', text: stringifiedPayload }` block for both completed and accepted paths (prevents Cursor hang).
- Added `scripts/poll_job_result.js` to manually poll `/modal/job/:id` when Cursor receives an accepted response.
- Verified end-to-end in Cursor with `use_langdb: true` returning synchronous results; example `correlation_id` observed in logs.

## Diagnostics (this session)
- Verified `/diag/langdb` POST with minimal and valid payloads
- Confirmed GET now returns a 405-style hint with example POST body
- Added `/routes` for route auditing; confirmed route registration order and presence

### Validation (this session)
- Repo pushed to GitHub (`main`)
- In-Cursor test: invoked `sequential_thinking` three times; each returned `{ ok: true, status: "recorded" }`
 - Added `/diag` and `/diag/langdb`; verified env presence and active LangDB probe
 - Implemented Modal-offloaded LangDB flow; tool now returns `{ status: "accepted", correlation_id, poll }` then final via webhook
  - Applied Cursor-compat response mapping (content[] text); Cursor now shows final results synchronously when within the 120s window

### Next Steps
1. FINALIZED: Adopted per-step parity with minimal return shape; client (Agent) controls chaining.
2. Implemented: removed auto/auto_chain multi-step paths from JSON-RPC; standardized minimal per-step response.
3. Implemented guardrails: rate limiting (env-tunable), input length caps, structured errors.
4. TODO: Add provider switch (Claude Sonnet/Opus, GPT-4o/o1, Gemini 2.5, DeepSeek R1) and LangDB client wiring.
5. TODO: Railway deploy and end-to-end tests in Cursor Agent mode; document test scripts.
6. Optional: add first-class polling endpoint documentation in README for clients lacking native polling.

### Decisions & Considerations
- Keep state in-memory initially; add persistence later if needed
- Prefer streamable HTTP via mcp-remote compatibility
- No standard JSON-RPC field to force client follow-up; client (Agent) drives chaining
- Align tool response shape with third-party parity to avoid client confusion
- Cursor expects `content[]` blocks; returning raw custom fields may lead to hidden/ignored results.
