---
Date: 2025-08-24
TaskRef: "Vercel deployment resolution for monorepo SvelteKit admin-dashboard"

Learnings:
- Vercel serverless functions require `@sveltejs/kit` to be in `dependencies` rather than `devDependencies` to avoid `ERR_MODULE_NOT_FOUND` at runtime
- Monorepo structures require explicit root directory configuration in Vercel dashboard to ensure correct project is built
- SvelteKit adapter-auto automatically detects Vercel environment and configures appropriate build settings
- Minimal vercel.json configuration is sufficient when using adapter-auto with proper package.json setup
- Local build verification (`npm run build`) is essential before deployment to catch configuration issues early
- Vercel dashboard settings must be updated to set root directory to `admin-dashboard` for monorepo projects

Difficulties:
- Initial deployment failed with `ERR_MODULE_NOT_FOUND` for `@sveltejs/kit` due to devDependencies placement
- Monorepo structure caused Vercel to attempt building root project instead of admin-dashboard
- Required multiple configuration adjustments across package.json, vercel.json, svelte.config.js, and vite.config.ts

Successes:
- Successfully resolved all Vercel deployment issues through systematic configuration updates
- Local build verification passed after all configuration changes
- Vercel deployment now completes successfully with full functionality
- Admin-dashboard is now fully operational in production Vercel environment
- All previous deployment errors have been eliminated

Improvements_Identified_For_Consolidation:
- Document Vercel monorepo deployment pattern for future reference
- Create deployment checklist for SvelteKit + Vercel projects
- Consider adding deployment verification scripts to CI/CD pipeline
- Document environment variable configuration for Vercel dashboard
- Add Vercel deployment troubleshooting guide to project documentation

---
Date: 2025-08-20
TaskRef: "Refactor logging/http client, modularize LangDB, SSE hardening, tests, push & deploy Modal"

Learnings:
- Introduced a centralized `logger` (pino + pino-pretty) and shared `httpClient` (axios + interceptors) to standardize logging and HTTP error handling across the codebase.
- Modularizing LangDB into `urlBuilder`, `request`, `response`, and `cost` modules makes parsing, URL assembly, request mapping, and cost calculation testable and easier to reason about.
- Replacing ad-hoc `console.*` calls with structured `logger` improves observability and enables consistent context (route, correlation_id, timing) in logs.
- SSE robustness: listening for `req.raw` 'close' and 'aborted' events, guarding writes, and setting headers (disable buffering/compression) prevents resource leaks and improves streaming reliability.
- Tests first: Adding Jest + ts-jest and unit tests for LangDB modules prevents regressions during larger refactors (DI, route modularization).
- Modal redeploy is straightforward via `modal deploy modal_app.py`; remember to address Modal deprecation warnings (GPU config and autoscaling param names).

Difficulties:
- Multiple code paths used different HTTP stacks and logging; required incremental consistent replacement to avoid breaking behavior.
- Parsing assistant outputs required defensive heuristics (fenced blocks, embedded arrays); edge cases remain for malformed model outputs.

Successes:
- Added `src/utils/logger.ts` and `src/utils/httpClient.ts`; refactored `perplexityAsk` to use the http client and logger with AbortSignal support.
- Replaced `console.*` usages across core modules (router, provider, LangDB client) with structured `logger` calls.
- Split LangDB logic into `src/providers/langdb/{urlBuilder,request,response,cost,index}.ts` and implemented `callLangdbSteps` facade returning a discriminated union.
- Hardened SSE in `src/sequentialTool.ts` with client disconnect handlers and guarded writes.
- Added Jest, tests, and scripts; wrote unit tests for LangDB modules and committed them.
- Committed and pushed to `origin/main` and deployed Modal worker; Modal returned a submit URL and app deploy link.

Improvements_Identified_For_Consolidation:
- Continue expanding unit/integration tests (httpClient retries, webhook accepted→poll flows, recommender parsing).
- Add DI (`tsyringe`) and a `createServer()` seam for testable server bootstrapping.
- Document new envs in `.env.example` (e.g., `LANGDB_PRICE_PER_1K`, `KEEPALIVE_MS`, `LANGDB_ALLOW_NONDEFAULT_TEMPERATURE`).
