# Vercel Deployment Configuration Unification

## Problem Summary

The admin dashboard was experiencing `ERR_MODULE_NOT_FOUND: Cannot find package '@sveltejs/kit'` errors during Vercel serverless function execution. This was caused by configuration conflicts between project settings dashboard overrides and the codebases configuration.

## Root Causes Identified

1. **Node.js Version Mismatch**: Project was configured for Node 22.x but Vercel was using Node 20.x
2. **Dependency Structure Issues**: `@sveltejs/kit` was in devDependencies but needed at runtime for Vercel adapter
3. **Configuration Conflicts**: Project settings dashboard overrides were conflicting with vercel.json
4. **Build Command Inconsistencies**: Complex nested build commands causing pnpm workspace issues
5. **Function Bundling Problems**: Serverless functions not properly including all dependencies

## Solution Implemented

### 1. Unified vercel.json Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "framework": "sveltekit",
  "outputDirectory": ".svelte-kit/output",
  "functions": {
    "src/routes/**/*": {
      "runtime": "nodejs22.x",
      "maxDuration": 30,
      "memory": 1024,
      "includeFiles": "node_modules/**"
    }
  },
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

Key changes:
- Removed complex nested directory commands
- Unified Node.js version to 22.x
- Simplified build and install commands
- Proper function configuration with runtime and memory settings
- Removed legacy routes configuration

### 2. Updated svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',
      regions: ['iad1'],
      external: [],
      split: false,
      maxDuration: 30
    })
  }
};

export default config;
```

Key changes:
- Updated to use `vitePreprocess` instead of `sveltePreprocess`
- Unified Node.js runtime to 22.x
- Added `maxDuration` setting
- Maintained `split: false` for proper bundling

### 3. Updated vite.config.ts

```javascript
export default defineConfig({
  build: {
    target: 'node22',
    outDir: '.svelte-kit/output'
  }
  // ... other configuration
});
```

Key changes:
- Updated Node.js target to 22
- Set proper output directory

### 4. Fixed package.json Dependencies

Moved `@sveltejs/kit` from devDependencies to dependencies to ensure it's available at runtime for the Vercel adapter.

## Key Lessons Learned

### 1. Configuration Hierarchy
The configuration hierarchy is:
**Route-level config > Adapter config > vercel.json > Project Settings > Defaults**

### 2. Dependency Management
For Vercel deployments with SvelteKit:
- `@sveltejs/kit` must be in dependencies (not devDependencies) when using adapter-vercel
- All runtime dependencies must be properly included in serverless bundles

### 3. Node.js Version Consistency
- Ensure package.json engines, vercel.json, and svelte.config.js all use the same Node.js version
- Vercel's default Node.js version may differ from your local environment

### 4. Build Command Best Practices
- Avoid complex nested directory commands in Vercel settings
- Let Vercel handle the working directory automatically
- Use simple, direct commands that work in the project root

### 5. Function Configuration
- Use proper glob patterns for function matching
- Set appropriate runtime, memory, and duration limits
- Include all necessary files in the bundle

## Testing the Fix

1. **Local Build Test**: Run `pnpm run build` to ensure the build completes successfully
2. **Vercel Deployment**: Deploy to Vercel and monitor the build logs
3. **Runtime Test**: Verify the application loads correctly in production

## Future Considerations

1. **Monitoring**: Set up proper logging and monitoring for Vercel functions
2. **Performance**: Consider function splitting for better cold start performance
3. **Security**: Review environment variable handling and security settings
4. **Scaling**: Configure appropriate regions and function limits for production traffic

This unified configuration approach eliminates conflicts between dashboard settings and codebase configuration, ensuring consistent and reliable deployments.