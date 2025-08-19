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
- `provider.ts`: Provider/model config (env-based) and step generation stub for SSE

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
 - Diagnostics endpoints should avoid hard failures: validate payloads, log raw request body (truncated), and return actionable errors (e.g., include `received` snippet)
 - Provide GET fallback for diagnostic POST routes to guide users (e.g., `/diag/langdb` returns 405-style hint with example payload)

### Configuration & Secrets
- `.env` for LANGDB and Perplexity URLs/keys
- No secrets in client-visible responses
 - Increase default diagnostic timeout to 30s to accommodate slower upstreams
 - Ensure `RAILWAY_ANALYTICS_URL` and `RAILWAY_ANALYTICS_KEY` are set in Railway environment and passed to Modal worker as secrets.

### Extensibility
- Add new tools via `src/mcpTools/*`
- Swap transports or add adapters behind clean interfaces
 - Add `/routes` debug endpoint for transient route auditing during deployments

## UI/UX Design System
**Liquid Glass Aesthetic**: Implemented Apple-inspired "Liquid Glass" design principles (macOS 26/iOS 26) with translucent materials, dynamic gradients, and fluid animations for the admin dashboard. This includes core design tokens, base glass components, and advanced navigation elements.

**Visualizations**: Integrated Chart.js with custom glassmorphic themes and implemented real-time performance radar and cost analytics charts, enhancing data visualization capabilities.

**Layout & Components**: Transformed the dashboard layout with a new grid system and enhanced data table components (SessionsTable, RecentLogs) with glass aesthetics and improved interactivity.

**Performance & Accessibility**: Optimized backdrop-filter performance, added `prefers-reduced-motion` handling, implemented explicit color contrast rules, and ensured WCAG compliance for a responsive and accessible user experience.
