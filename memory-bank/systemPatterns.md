# System Patterns

### Architecture Overview
- Transport: Fastify + Server-Sent Events (primary), stdio (optional)
- Reasoning: Claude Opus 4 via LangDB AI Gateway
- Grounding: Perplexity-Ask MCP tool (HTTP call)
- Tools: `sequential_thinking`, `perplexity.search` (wrapper), room for more
- State: In-memory session state with optional pluggable persistence

### Module Responsibilities
- `index.ts`: Server bootstrap, env loading, transport selection
- `router.ts`: Route definitions; SSE endpoint for sequential runs
- `sequentialTool.ts`: Orchestrates breakdown, tool recs, branching, progress
- `claudeClient.ts`: LangDB client wrapper; structured prompts and tool schemas
- `mcpTools/perplexityAsk.ts`: Outbound HTTP to Perplexity-Ask MCP server
- `progress.ts`: State machine for steps, branches, and revisions

### Typical Flow (Text Diagram)
Client → SSE/stdio → MCP Server → LangDB (Claude Opus 4)
  ↘──────── Perplexity-Ask (on demand) ────────↗
Streamed progress/results → Client

Sequence:
1. Receive user request over SSE/stdio
2. Call Claude for initial breakdown and tool recs
3. If rec includes Perplexity, call Perplexity-Ask and return results to Claude
4. Iterate steps; support branches/revisions
5. Stream progress updates and final result

### Error Handling
- Graceful error objects streamed over SSE
- Timeouts and retries for external calls
- Input validation and structured error responses

### Configuration & Secrets
- `.env` for LANGDB and Perplexity URLs/keys
- No secrets in client-visible responses

### Extensibility
- Add new tools via `src/mcpTools/*`
- Swap transports or add adapters behind clean interfaces
