---
Date: 2025-08-24
TaskRef: "Vercel deployment resolution - pnpm install & build verification"

Learnings:
- Successfully resolved all build-time errors through systematic configuration fixes
- Runtime configuration in svelte.config.js must use supported Vercel runtimes (nodejs18.x vs nodejs22.x)
- Merge conflicts in configuration files can cause syntax errors during build
- Local build verification (`pnpm run build`) is essential before deployment
- All dependencies are now properly resolved and included in the build

Difficulties:
- Encountered syntax error in svelte.config.js due to merge conflict (======= markers)
- Runtime configuration initially used unsupported nodejs22.x
- Required careful file cleanup to remove merge conflict artifacts

Successes:
- ✅ **Build Success**: Admin-dashboard now builds successfully with `pnpm run build`
- ✅ **Runtime Fix**: Updated svelte.config.js to use nodejs18.x (supported runtime)
- ✅ **Configuration Cleanup**: Fixed merge conflicts and syntax errors
- ✅ **Dependencies Verified**: All required packages properly installed and resolved
- ✅ **Output Generated**: Both client and server build outputs created successfully
- ✅ **Vercel Adapter**: Successfully using @sveltejs/adapter-vercel with correct configuration

Improvements_Identified_For_Consolidation:
- Add pre-commit hooks to prevent merge conflicts in configuration files
- Create build verification script for CI/CD pipeline
- Document Vercel runtime compatibility matrix
- Add automated testing for build process

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
[Previous content remains...]
