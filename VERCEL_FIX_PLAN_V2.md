# Vercel Runtime Error Fix Plan V2

## Problem Analysis
The Vercel serverless function is crashing at runtime with `ERR_MODULE_NOT_FOUND` for `@sveltejs/kit`. This indicates the package is not being included in the serverless bundle despite being in dependencies.

## Root Cause Analysis
Based on research from Vercel community and SvelteKit issues:
1. `@sveltejs/kit` is listed as a dependency but is actually a dev dependency in practice
2. The Vercel adapter is not bundling `@sveltejs/kit` correctly in serverless functions
3. Package resolution issues in the serverless environment due to pnpm workspace structure

## Comprehensive Fix Strategy

### Phase 1: Dependency Management Fix
1. **Move `@sveltejs/kit` to devDependencies** (counterintuitive but correct)
2. **Add `@sveltejs/adapter-vercel` to dependencies**
3. **Fix pnpm workspace configuration**

### Phase 2: Build Configuration Overhaul
1. **Update adapter configuration** with proper bundling
2. **Configure Vercel build settings** for pnpm
3. **Add explicit bundling configuration**

### Phase 3: Alternative Deployment Strategy
1. **Use adapter-auto** as fallback
2. **Configure standalone deployment**
3. **Add build verification steps**

## Implementation Steps

### Step 1: Update package.json
```json
{
  "dependencies": {
    "@fontsource/inter": "^5.2.6",
    "@sveltejs/adapter-vercel": "^3.1.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "chart.js": "^4.5.0",
    "echarts": "^5.5.1",
    "flowbite": "^2.5.1",
    "flowbite-svelte": "^0.47.4",
    "svelte": "^5.38.2"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.36.1",
    "@types/node": "^20.14.10",
    "autoprefixer": "^10.4.19",
    "eslint": "^9.6.0",
    "eslint-plugin-svelte": "^2.44.0",
    "postcss": "^8.4.40",
    "svelte-check": "^3.8.6",
    "svelte-preprocess": "^5.1.4",
    "tailwindcss": "^3.4.9",
    "terser": "^5.31.0",
    "tslib": "^2.6.3",
    "typescript": "^5.5.3",
    "vite": "^5.3.3"
  }
}
```

### Step 2: Update svelte.config.js with proper bundling
```javascript
import adapter from '@sveltejs/adapter-vercel';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
  warningFilter: (warning) => {
    const ignore = [
      'a11y_click_events_have_key_events',
      'a11y_no_static_element_interactions',
      'a11y_no_noninteractive_element_interactions',
      'export_let_unused'
    ];
    return !ignore.includes(warning.code);
  },
  kit: {
    adapter: adapter({
      runtime: 'nodejs20.x',
      regions: ['iad1'],
      // Ensure all dependencies are bundled
      external: [],
      split: false // Bundle everything together
    })
  }
};

export default config;
```

### Step 3: Update vercel.json for pnpm compatibility
```json
{
  "version": 2,
  "buildCommand": "cd admin-dashboard && pnpm install --no-frozen-lockfile && pnpm run build",
  "installCommand": "npm install -g pnpm && cd admin-dashboard && pnpm install --no-frozen-lockfile",
  "devCommand": "cd admin-dashboard && pnpm run dev",
  "framework": "sveltekit",
  "outputDirectory": ".svelte-kit/vercel",
  "functions": {
    "index.js": {
      "includeFiles": "node_modules/**"
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Step 4: Update vite.config.ts for serverless
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: []
    },
    target: 'node20'
  },
  ssr: {
    noExternal: ['@sveltejs/kit', 'chart.js', 'echarts']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'https://gallant-reflection-production.up.railway.app',
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ['chart.js', 'echarts']
  },
  define: {
    global: 'globalThis',
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1')
  },
  logLevel: 'warn'
});
```

### Step 5: Add .npmrc for pnpm compatibility