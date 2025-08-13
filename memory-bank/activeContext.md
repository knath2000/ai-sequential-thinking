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

### Next Steps
1. Implement `claudeClient.ts` (LangDB Claude) and `mcpTools/perplexityAsk.ts`
2. Orchestrate full sequential thinking loop in `sequentialTool.ts` with streaming updates
3. Extend `/run` to strict MCP tool schema with validation
4. Add provider switch (Claude Opus 4 / Sonnet, GPT-4o/o1, Gemini 2.5, DeepSeek R1/Llama) per recommendation matrix

### Decisions & Considerations
- Keep state in-memory initially; add persistence later if needed
- Prefer SSE for developer ergonomics and streaming UX
- Strictly separate transport, orchestration, and tool adapters
