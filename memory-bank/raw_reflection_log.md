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
