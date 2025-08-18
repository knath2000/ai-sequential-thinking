## MCP Tool Response Shape
**Pattern: Minimal per-step returns; client drives chaining**
- Return a compact, standardized content block per call.
- Do not embed auto-chaining or multi-step orchestration in the JSON-RPC API.
- Rationale: Aligns with Agent-driven follow-ups and avoids protocol ambiguities across clients.

## Guardrails
**Rate limiting and input caps**
- Implement simple in-memory rate limiting keyed by session/IP with env-tunable window and max.
- Enforce input size caps (e.g., `thought` length) and return structured error objects consistently.

## Testing & Validation
**Cursor-first MCP validation**
- Validate tool behavior by invoking the MCP tool directly in Cursor chat once the server is active.
- Expect minimal per-step "recorded" responses; rely on the Agent for chaining. Helps detect protocol mismatches early.

## Diagnostics & Offload Patterns
**Production diagnostics endpoints**
- Add `/diag` for non-secret env previews and `/diag/langdb` to actively probe external gateways with short timeouts.
 - For diagnostic routes expecting POST JSON, provide a GET fallback that returns a hint and example payload to reduce developer confusion.
 - Validate request bodies and log a truncated raw payload to speed up diagnosing JSON parsing issues (avoid logging secrets).
 - Default diagnostic timeouts to ~30s to reduce false negatives when upstreams are slow.

**Modal offload pattern**
- When external gateway calls must be isolated, route requests to Modal with `correlation_id`, perform the gateway call there, then post results back to the server webhook.
- Return `{ status: "accepted", correlation_id, poll }` immediately; allow polling and/or synchronization with a capped timeout.
- Sign webhook callbacks with HMAC and implement retries with backoff.

**Deployment-time route verification**
- Provide a `/routes` debug endpoint during active development to verify route registration quickly in deployed environments; remove or guard it for production.

## Cursor Interop Fix
**Pattern: Wrap MCP tool outputs in `content[]` text**
- For Cursor compatibility, always return `result` as `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }` for both completed and accepted paths.
- If synchronous completion may exceed typical client timeouts, increase server sync window (e.g., 120s) and simplify/accelerate the LLM path (faster model, smaller prompt).
- Provide a documented polling fallback (e.g., `/modal/job/:id` and a small `scripts/poll_job_result.js`).
# Consolidated Learnings
## Live Analytics Dashboard (SvelteKit + FastAPI)
**Patterns:**
- Serve SvelteKit build via FastAPI `StaticFiles` mounted at `/dashboard`; set Svelte base path to `/dashboard`.
- Use SSE for live KPIs and REST for historical charts; test SSE with `curl -N`.
- In dev, set Vite proxy `/api` → production host and default frontend API base to `/api` to avoid CORS.
- Guard static mounts with absolute paths and skip if missing to prevent startup crashes.
- Add simple REQ/RES logging middleware in FastAPI during active dev to trace status codes in Railway.

**Auth & Ingestion:**
- Support analytics ingestion with either `Authorization: Bearer <token>` or `X-Analytics-Ingest-Key: <secret>`; make bearer optional when ingest key matches.
- Tool-side analytics client should enable automatically: default backend URL to production and send either bearer or ingest key header.

## Cost Tracking & Observability (New)
- **Pattern: Cost event instrumentation**: Log LangDB and Modal costs at call sites. Estimate LangDB costs via a simple tokens * price-per-1k formula (`LANGDB_PRICE_PER_1K` env var) and log Modal costs when provided by the submit API or webhook payload.
- **Pattern: Idempotent cost ingestion**: Prevent duplicate cost records by deduplicating on `(request_id, service_name, operation_type)` either via a unique constraint in the DB or a pre-insert lookup in the analytics service.
- **Pattern: Dashboard integration**: Provide `/api/v1/analytics/costs/summary` and `/api/v1/analytics/costs` endpoints for dashboard widgets. Client includes `X-Analytics-Ingest-Key` from `VITE_ANALYTICS_INGEST_KEY` for simple ingestion authentication.
- **Pattern: Auth-failure logging**: Capture 401/authorization failures in an `auth_failures` table with request headers and client IP to facilitate debugging and alerting.


## MCP + Cursor Interop
- Use JSON-RPC streamable HTTP with `protocolVersion: 2025-06-18`; implement `initialize`, `tools/list`, `tools/call`, 204 for `notifications/initialized`.
- `inputSchema` must use camelCase (`inputSchema`).
- No recognized JSON field to force auto-follow-up; chaining is agent-driven or server does single-call orchestration.

## Orchestration Modes
- Single-call mode (auto=true): server performs all steps and returns `{ summary, steps, citations }`.
- Per-step mode (agent-driven): return minimal step fields (`thought_number`, `total_thoughts`, `next_thought_needed`, etc.); no proposal fields.

## Integration Patterns
- For parity with third-party tools, prefer minimal per-step outputs and let Cursor Agent auto-advance.
- For deterministic outcomes, use single-call aggregation with optional Perplexity enrichment.

## Next Implementation
- Choose and standardize one mode; add guardrails and provider switch (Claude/GPT/Gemini/DeepSeek).

## Sequential Thinking Enhancements (2025-08-14)

**Pattern: Enhanced per-step schema with tool recommendations**
- Use a structured `SequentialThinkingOutput` that includes `current_step`, `recommended_tools` (with `confidence`, `rationale`, `priority`), `previous_steps`, and `remaining_steps`.
- Wrap MCP tool outputs in `content[]` with `{ type: 'text', text: JSON.stringify(payload) }` for Cursor compatibility.

**Pattern: Recommender & Modal Offload**
- Centralize LangDB payload assembly for Modal offloads via `buildModalPayloadForLangdb`.
- Implement a `recommender` module to call LangDB and produce `RecommendedTool` entries; fall back to heuristics if parsing fails.

**Operational Notes**
- Add `MAX_HISTORY_SIZE` env var (default 1000) and auto-trim histories in `addThought`.
- Add `USE_ENHANCED_SCHEMA` feature flag to toggle enhanced outputs for backward compatibility.
- Document `AVAILABLE_MCP_TOOLS` env variable to inform the recommender which tools exist.

**Next steps for consolidation**
- Improve LangDB prompt + parsing to return structured recommendations reliably.
- Add unit tests and CI to validate schema, recommender parsing, and Modal callback flows.
