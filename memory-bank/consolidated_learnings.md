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

**Modal offload pattern**
- When external gateway calls must be isolated, route requests to Modal with `correlation_id`, perform the gateway call there, then post results back to the server webhook.
- Return `{ status: "accepted", correlation_id, poll }` immediately; allow polling and/or synchronization with a capped timeout.
- Sign webhook callbacks with HMAC and implement retries with backoff.

## Cursor Interop Fix
**Pattern: Wrap MCP tool outputs in `content[]` text**
- For Cursor compatibility, always return `result` as `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }` for both completed and accepted paths.
- If synchronous completion may exceed typical client timeouts, increase server sync window (e.g., 120s) and simplify/accelerate the LLM path (faster model, smaller prompt).
- Provide a documented polling fallback (e.g., `/modal/job/:id` and a small `scripts/poll_job_result.js`).
# Consolidated Learnings

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
