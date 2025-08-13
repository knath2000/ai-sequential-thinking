# Product Context

### Why
Developers need a reliable, structured reasoning tool that can decompose complex tasks, suggest appropriate tools, ground answers on the web, and stream progress transparently. Existing servers demonstrate patterns we unify into a minimal, extensible implementation.

### Who
- Developers using Claude Desktop and MCP
- Power users who want transparent, stepwise reasoning and tool orchestration

### User Stories
- As a developer, I want a sequential-thinking tool that breaks down my goal, proposes tools with confidence and rationale, and tracks progress so I can follow along and intervene.
- As a researcher, I want integrated web grounding (Perplexity-Ask) so answers are up to date and cite sources.
- As an integrator, I want simple env-based config and a single Fastify server with SSE, with stdio fallback.

### KPIs
- Time-to-first-response (SSE latency)
- Successful tool invocations per task
- Step clarity and usefulness (qualitative)
- Error rate (timeouts, missing env, transport issues)

### Constraints
- Keep the server minimal; prioritize clarity and reliability over features
- Ensure Claude Desktop compatibility for MCP tools
