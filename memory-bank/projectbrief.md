# Project Brief: AI-Driven Sequential Thinking MCP Server

### Objective
Build a custom Model Context Protocol (MCP) server that replicates and extends sequential-thinking capabilities from:
- @MattMagg/sequential-thinking-claude-code
- @arben-adm/mcp-sequential-thinking
- @xinzhongyouhai/mcp-sequentialthinking-tools

Powered by Claude Opus 4 via the LangDB AI Gateway, with grounding via a Perplexity-Ask MCP tool. The server must support Fastify SSE transport and optional stdio, and be compatible with Claude Desktop.

### Scope
- Implement a `sequential_thinking` tool that:
  - Produces step-by-step breakdowns
  - Recommends tools with confidence and rationale
  - Supports branching and revisions
  - Tracks progress and state across steps
- Integrate a Perplexity-Ask MCP tool for web-grounded research
- Provide Fastify SSE endpoint(s) and a stdio fallback
- Offer minimal security (key management, basic rate-limiting), configuration, and dev UX (scripts, tests)

### Non-Goals
- Building a full marketplace or plugin system
- Complex persistence beyond lightweight local storage initially

### Deliverables
- Working TypeScript server with `src/` modules:
  - `index.ts`, `router.ts`, `sequentialTool.ts`, `claudeClient.ts`, `mcpTools/perplexityAsk.ts`
- `.env.example` and documentation in `README.md`
- Local test scripts and example requests

### Success Criteria
- End-to-end demo: client → SSE endpoint → Claude (LangDB) → Perplexity tool → streamed results
- Claude Desktop can call the MCP tools without modification
- Sequential runs show breakdown, tool recs + confidence, branching/revisions, and progress updates

### Risks & Assumptions
- Access to LangDB AI Gateway and Claude Opus 4 is available and stable
- Perplexity-Ask MCP tool is reachable locally or via container
- SSE and stdio semantics align with Claude Desktop expectations

### Recent additions (Aug 2025):
- Centralized logging (`src/utils/logger.ts`) and shared HTTP client (`src/utils/httpClient.ts`).
- LangDB modularization and unit tests (`src/providers/langdb/*`, `__tests__/providers/langdb/*`).
- SSE hardening and Cursor compatibility fixes; Modal offload via `modal_app.py` deployed.

### References
- Glama servers above; LangDB AI Gateway docs; MCP protocol + Claude Desktop configuration
