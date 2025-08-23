# Vercel Runtime Error Fix Plan

## Problem Analysis
The Vercel serverless function is crashing at runtime with `ERR_MODULE_NOT_FOUND` for `@sveltejs/kit`. This indicates the package is not being included in the serverless bundle.

## Root Cause
1. `@sveltejs/kit` is listed in `dependencies` but may not be bundled correctly
2. The Vercel adapter configuration might be excluding it
3. Package resolution issues in the serverless environment

## Fix Strategy

### Phase 1: Package Configuration Fix
1. **Move `@sveltejs/kit` to dependencies** (it's already there, but verify)
2. **Update adapter configuration** to ensure proper bundling
3. **Add explicit external dependencies** configuration

### Phase 2: Build Configuration Updates
1. **Update svelte.config.js** to include all necessary packages
2. **Modify vercel.json** to ensure proper build process
3. **Add vite.config.js optimization** for serverless

### Phase 3: Verification Steps
1. **Test build locally** with production settings
2. **Verify serverless bundle** includes required packages
3. **Deploy and test** on Vercel

## Implementation Steps

### Step 1: Update svelte.config.js
```javascript
import adapter from '@sveltejs/adapter-vercel';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapter({
      runtime: 'nodejs20.x',
      regions: ['iad1'],
      // Ensure all dependencies are bundled
      external: []
    })
  }
};

export default config;
```

### Step 2: Update vercel.json
```json
{
  "version": 2,
  "buildCommand": "cd admin-dashboard && pnpm run build",
  "installCommand": "cd admin-dashboard && pnpm install --no-frozen-lockfile",
  "devCommand": "cd admin-dashboard && pnpm run dev",
  "framework": "sveltekit",
  "outputDirectory": ".svelte-kit/vercel",
  "functions": {
    "index.js": {
      "includeFiles": "node_modules/@sveltejs/kit/**"
    }
  }
}
```

### Step 3: Update vite.config.ts
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: []
    }
  },
  ssr: {
    noExternal: ['@sveltejs/kit']
  }
});
```

### Step 4: Package.json Verification
Ensure `@sveltejs/kit` is in `dependencies` (not devDependencies) for serverless compatibility.

## Testing Commands
```bash
# Clean build
cd admin-dashboard
rm -rf .svelte-kit .vercel build
pnpm install
pnpm run build

# Test serverless bundle
cd .svelte-kit/vercel-tmp
node index.js
```

## Deployment Verification
1. Deploy to Vercel
2. Check function logs
3. Verify no module resolution errors
4. Test all dashboard functionality

## Alternative Solutions
If the above doesn't work:
1. Use `@sveltejs/adapter-auto` instead of `@sveltejs/adapter-vercel`
2. Add explicit `bundle` configuration in adapter
3. Use `pnpm deploy` to create a self-contained deployment