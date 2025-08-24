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
- Ensure Modal worker passes `RAILWAY_ANALYTICS_URL` and `RAILWAY_ANALYTICS_KEY` in the payload for cost reporting.

**Deployment-time route verification**
- Provide a `/routes` debug endpoint during active development to verify route registration quickly in deployed environments; remove or guard it for production.

## Cursor Interop Fix
**Pattern: Wrap MCP tool outputs in `content[]` text**
- For Cursor compatibility, always return `result` as `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }` for both completed and accepted paths.
- If synchronous completion may exceed typical client timeouts, increase server sync window (e.g., 120s) and simplify/accelerate the LLM path (faster model, smaller prompt).
- Provide a documented polling fallback (e.g., `/modal/job/:id` and a small `scripts/poll_job_result.js`).

## Vercel Monorepo Deployment
**Pattern: Configure root directory for monorepo**
- When deploying SvelteKit apps in monorepos, set Vercel's **Root Directory** to the specific project folder (e.g., `admin-dashboard`)
- This ensures Vercel uses the correct package.json and build process instead of the root project
- Required settings:
  - **Root Directory**: `admin-dashboard`
  - **Framework Preset**: SvelteKit (auto-detect)
  - **Build Command**: Leave empty (uses `pnpm run build`)
  - **Install Command**: Leave empty (uses `pnpm install`)
- **Dependencies**: Ensure `@sveltejs/kit` is in `dependencies` not `devDependencies` for Vercel serverless functions
- **Adapter**: Use `@sveltejs/adapter-auto` for automatic Vercel detection
- **Vercel.json**: Minimal configuration with `{"buildCommand": "pnpm run build", "outputDirectory": "build"}`

# Consolidated Learnings
## Live Analytics Dashboard (SvelteKit + FastAPI)
**Patterns:**
- Serve SvelteKit build via FastAPI `StaticFiles` mounted at `/dashboard`; set Svelte base path to `/dashboard`.
- Use SSE for live KPIs and REST for historical charts; test SSE with `curl -N`.
- In dev, set Vite proxy `/api` → production host and default frontend API base to `/api` to avoid CORS.
- Guard static mounts with absolute paths and skip if missing to prevent startup crashes.
- Add simple REQ/RES logging middleware in FastAPI during active dev to trace status codes in Railway.
- Implement a dedicated `/internal/modal-cost-callback` endpoint on Railway to receive and log cost data from Modal.
- Implemented `DashboardMetrics` schema with `cost_history`, `performance_metrics_data`, and `usage_distribution_data` for chart visualization.
- Enhanced `AnalyticsService` to provide these new data points for dashboard metrics.

## Backend Exception Handling
**Pattern: Global Exception Handler with CORS**: 
- Implement a global exception handler in FastAPI (`app.exception_handler(Exception)`) to catch all unhandled exceptions.
- Manually add `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` to the `JSONResponse` in the exception handler to ensure CORS headers are present even for 500 errors.
- Set `debug=True` in `FastAPI` app initialization for better error visibility during development.

## Frontend Build & Runtime Fixes
**Pattern: SvelteKit Warning Suppression**: 
- Move `warningFilter` to the root level of `svelte.config.js` and update warning codes to use underscores (e.g., `a11y_click_events_have_key_events`).
- Provide default values for optional props in Svelte components to prevent warnings (e.g., `export let level: string = '';`).
- Explicitly declare SvelteKit routing props (`export let data = {}; export let form = null;`) in `+layout.svelte` and `+page.svelte` to prevent "unknown prop" warnings.

**Pattern: Robust API Connection**: 
- Enhance `connectSSE` and `fetchJson` functions in `src/lib/api.ts` with retry logic and comprehensive error handling, including exponential backoff, to improve stability for connections to Railway backend.

**Pattern: Chart.js Data Handling**: 
- Implement defensive programming in Chart.js components (`GlassChart.svelte`, `CostAnalyticsChart.svelte`) by adding null checks (`if (!data || !data.datasets) return;`) before chart initialization.
- Include reactive updates (`$: if (chartInstance && data && data.datasets) { chartInstance.update(); }`) to ensure charts react to data changes.
- Add loading states with shimmer animations to improve user experience during data fetching.

**Pattern: Vite & SvelteKit Optimization**: 
- Configure `vite.config.ts` to include `hmr: { overlay: false }`, `optimizeDeps: { exclude: ['@sveltejs/kit', 'svelte'] }`, `define: { global: 'globalThis' }`, `build: { sourcemap: false }`, and `logLevel: 'warn'` to resolve HMR issues, suppress warnings, and optimize the build process.
- Add a data URI favicon in `src/app.html` to prevent 404 errors for favicon requests.
- Implement explicit CSS for heading elements (`h1`, `h2`, `h3`) in `src/styles.css` to address accessibility warnings and ensure consistent typography.

## UI/UX Design System
**Liquid Glass Aesthetic**: Implemented Apple-inspired "Liquid Glass" design principles (macOS 26/iOS 26) with translucent materials, dynamic gradients, and fluid animations for the admin dashboard. This includes core design tokens, base glass components, and advanced navigation elements.

**Visualizations**: Integrated Chart.js with custom glassmorphic themes and implemented real-time performance radar and cost analytics charts, enhancing data visualization capabilities.

**Layout & Components**: Transformed the dashboard layout with a new grid system and enhanced data table components (SessionsTable, RecentLogs) with glass aesthetics and improved interactivity.

**Performance & Accessibility**: Optimized backdrop-filter performance, added `prefers-reduced-motion` handling, implemented explicit color contrast rules, and ensured WCAG compliance for a responsive and accessible user experience.

## Backend Application Startup & Stability
**Pattern: `NameError` and `TypeError` Resolution**: 
- Ensured `FastAPI` app instance (`app = FastAPI(...)`) is created before any `@app.middleware` decorators or `app`-dependent imports to prevent `NameError: name 'app' is not defined`.
- Replaced Python 3.9 incompatible type hints (`X | None`) with `Optional[X]` to resolve `TypeError` during startup.
- Restructured middleware registration to ensure proper order (`catch_exceptions_middleware` before `CORSMiddleware`).

**Pattern: `AttributeError` Resolution**: 
- Modified `AnalyticsService` to correctly query `PerformanceMetric.metric_value` and filter by `metric_name` (e.g., "average_response_time") instead of direct attribute access to `response_time_ms`.
- Refined data aggregation for `cost_history`, `performance_metrics_data`, and `usage_distribution_data` to ensure accurate chart data from the database.

## Auth & Ingestion:**
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

## Recent Engineering Changes (Aug 2025)
- **Shared logging & HTTP client**: Added `src/utils/logger.ts` (pino) and `src/utils/httpClient.ts` (axios interceptors) to standardize logs and HTTP error handling across modules.
- **LangDB modularization**: Split LangDB logic into `src/providers/langdb/{urlBuilder,request,response,cost,index}.ts` to isolate URL assembly, request mapping, response parsing, and cost calculation.
- **SSE hardening**: `src/sequentialTool.ts` now guards writes, listens to `close`/`aborted` events, and sets headers to avoid buffering/compression issues.
- **Unit tests**: Added Jest (`ts-jest`) configuration and unit tests for LangDB helpers under `__tests__/providers/langdb/`.
- **Modal deployment**: Deployed updated `modal_app.py` via `modal deploy modal_app.py`; Modal submit and app endpoints active.
- **Vercel deployment**: Successfully resolved monorepo configuration and deployed admin-dashboard to Vercel
- **Vercel production**: Successfully deployed to Vercel with full functionality

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

## Vercel Deployment Configuration (2025-08-24)
**Pattern: Monorepo SvelteKit Deployment**
- **Root Directory**: Set Vercel root directory to `admin-dashboard` instead of repository root
- **Dependencies**: Move `@sveltejs/kit` from `devDependencies` to `dependencies` in package.json
- **Adapter**: Use `@sveltejs/adapter-auto` for automatic Vercel detection
- **Configuration**: Minimal vercel.json with build and output settings
- **Build Process**: Ensure pnpm workspace configuration supports Vercel deployment
- **Testing**: Verify local build with `npm run build` before deployment
- **Environment**: Ensure all environment variables are properly configured in Vercel dashboard

**Deployment Steps**:
1. Configure Vercel root directory to `admin-dashboard`
2. Update package.json to include @sveltejs/kit in dependencies
3. Simplify vercel.json configuration
4. Update svelte.config.js with adapter-auto
5. Configure vite.config.ts for SSR
6. Test local build
7. Deploy to Vercel
8. Verify production functionality
