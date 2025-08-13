# Consolidated Learnings

## Sequential Thinking MCP Pattern
- Separate transport (SSE/stdio), orchestration, and tool adapters for clarity and testability.
- Use a LangDB client wrapper to standardize prompts, tool schemas, and headers.
- Treat web-grounding (Perplexity-Ask) as an external tool call; stream partial results back to the model and client.

## Minimal Env Surface
- `LANGDB_BASEURL`, `LANGDB_KEY`, `PERPLEXITY_ASK_URL`, `PORT`, `TRANSPORT` are sufficient for local and early prod.

## Developer Ergonomics
- Provide small scripts for dev, build, and test.
- Keep initial state in-memory; gate persistence behind an interface.

## Model Strategy (Aug 2025)
- Default: GPT-4o/o1 for speed/cost and robust tool/JSON.
- Quality-first: Claude Opus 4 for complex, high-stakes steps.
- Cost-first: Gemini 2.5 or DeepSeek R1 depending on vendor/self-hosting needs.
- Self-hosted: Llama 3 Reasoning or Mistral/Qwen; add guardrails and JSON repair.
