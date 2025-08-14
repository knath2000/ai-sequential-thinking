---
Date: 2025-08-13
TaskRef: "Finalize per-step behavior, add guardrails, prep provider switch"

Learnings:
- Client (Cursor Agent) controls chaining; minimal per-step tool results avoid protocol ambiguities.
- Simple in-memory rate limiting per session/IP is sufficient for dev; expose window/max via env.
- Input length caps on `thought` prevent accidental payload bloat and improve stability.

Difficulties:
- Prior auto/auto_chain paths caused confusion in JSON-RPC semantics; removed for parity.

Successes:
- Standardized JSON-RPC tool response to minimal content block; added structured errors consistently.
- SSE now streams basic step updates; ready to swap in provider-driven events.

Improvements_Identified_For_Consolidation:
- Pattern: Prefer per-step minimal returns for MCP tools; let orchestrators or clients handle chaining.
- Guardrails: Rate limit + input caps + structured error envelope.
---

---
Date: 2025-08-13
TaskRef: "Push to GitHub and validate MCP tool inside Cursor"

Learnings:
- Verifying MCP from inside Cursor confirms per-step parity works with Agent-driven chaining.
- Recording steps without heavy payloads keeps tool latency low and avoids client ambiguities.

Difficulties:
- None significant; ensured rate limiting didn’t interfere with rapid test calls.

Successes:
- Pushed repo to GitHub (`main`).
- Three sequential_thinking calls returned `{ ok: true, status: "recorded" }` in Cursor chat.

Improvements_Identified_For_Consolidation:
- Testing workflow: Prefer direct tool calls in Cursor for MCP validation after server updates.
---

---
Date: 2025-08-14
TaskRef: "Ensure LangDB usage and implement Modal-offloaded flow"

Learnings:
- Server-side envs must be set on Railway; client `~/.cursor/mcp.json` envs do not affect the server.
- Explicit diagnostics endpoints (`/diag`, `/diag/langdb`) accelerate env/probe verification.
- For reliability: timeouts, retries, and correlation IDs are essential when offloading to Modal.

Difficulties:
- Intermittent 502 were from server not responding (timeouts) and missing env in the deployed instance.
- Early LangDB calls returned stub due to missing env/varying URL shapes.

Successes:
- Added LangDB client with robust URL assembly and API key/project handling; source reporting improved.
- Implemented Modal-only LangDB path with webhook + poll; deployed Modal app and obtained submit URL.

Improvements_Identified_For_Consolidation:
- Pattern: add `/diag` endpoints for env previews and active probes in production.
- Offload design: accept→poll pattern with webhook, correlation IDs, and HMAC signing.
---

---
Date: 2025-08-14
TaskRef: "Fix Cursor hang: ensure content[] mapping, increase sync window, add poll script"

Learnings:
- Cursor often expects tool results in `content[]` blocks; returning custom top-level fields can result in hidden outputs.
- Increasing server sync wait (120s) and simplifying LLM prompt/model helps keep flows synchronous.
- Providing a manual polling script unblocks clients lacking native polling on accepted async jobs.

Difficulties:
- Async path returned accepted but Cursor didn’t poll; results persisted yet not shown.

Successes:
- Wrapped results in `content[]` text for both completed/accepted; Cursor now displays results directly.
- Modal worker timeout increased to 1800s; prompt simplified; model defaulted to `gpt-4o-mini` for speed.
- End-to-end verified in Cursor with `use_langdb:true` (correlation_id observed).

Improvements_Identified_For_Consolidation:
- Pattern: Always return MCP tool outputs as `content[]` with text in Cursor contexts.
- Add poll helper and document `/modal/job/:id`.
---

---
Date: 2025-08-13
TaskRef: "Implement JSON-RPC MCP server, Cursor integration, and auto-orchestrator"

Learnings:
- Cursor/mcp-remote expects JSON-RPC `protocolVersion` and camelCase `inputSchema`; notifications/initialized should be 204
- No standard JSON field to trigger automatic follow-up; Agent mode drives chaining
- Third-party sequentialthinking-tools returns minimal per-step metadata; Cursor auto-advances without proposed fields
- Two viable patterns: single-call auto aggregation (server orchestrates) vs per-step minimal (agent orchestrates)

Difficulties:
- Initial 404s (POST /, SSE) and schema errors (protocolVersion, inputSchema) blocked mcp-remote
- Auto-prompt was not triggered by our custom proposed field; not recognized by Cursor

Successes:
- Fixed transport and protocol compliance; local JSON-RPC tests pass
- Added auto_orchestrator and auto_chain; Modal worker deployed; webhook verified
- GitHub repo pushed; Cursor config updated; tools show up

Improvements_Identified_For_Consolidation:
- Decide final orchestration mode and standardize outputs
- Add guardrails (rate limit, sanitization) and provider switch
---
