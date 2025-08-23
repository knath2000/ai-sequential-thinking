# Vercel Deployment Fix Implementation Plan

## Problem Analysis
The Vercel serverless function is crashing with `ERR_MODULE_NOT_FOUND: Cannot find package '@sveltejs/kit'` because:
1. **Monorepo Configuration Issue**: The project is a pnpm monorepo but Vercel is not properly configured to handle the workspace structure
2. **Root Directory Misconfiguration**: Vercel is building from the root instead of the `admin-dashboard` directory
3. **Dependency Bundling Problem**: `@sveltejs/kit` is not being properly bundled in the serverless function
4. **Node.js Version Mismatch**: Inconsistent Node.js versions across configuration files

## Key Issues Identified
1. **Missing pnpm workspace configuration** in root directory
2. **Incorrect Vercel root directory setting** - should be `admin-dashboard`
3. **Dependency structure issues** - `@sveltejs/kit` needs to be available at runtime
4. **Configuration conflicts** between dashboard settings and codebase

## Fix Implementation Steps

### 1. Create pnpm workspace configuration
Create `pnpm-workspace.yaml` in the root directory:
```yaml
packages:
  - "admin-dashboard"
  - "admin-backend"
```

### 2. Update Vercel project settings
In Vercel dashboard, set:
- **Root Directory**: `admin-dashboard`
- **Build Command**: `pnpm run build`
- **Install Command**: `pnpm install --no-frozen-lockfile`
- **Output Directory**: Leave empty (uses default)

### 3. Update admin-dashboard/package.json
Ensure `@sveltejs/kit` is in dependencies (not devDependencies):
```json
{
  "dependencies": {
    "@sveltejs/kit": "^2.36.1",
    // ... other dependencies
  }
}
```

### 4. Update admin-dashboard/vercel.json
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "framework": "sveltekit",
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

### 5. Update admin-dashboard/svelte.config.js
```javascript
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
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
    // Use Vercel adapter for zero-config deployments on Vercel
    adapter: adapter({
      runtime: 'nodejs22.x',
      regions: ['iad1'],
      // Ensure all dependencies are bundled
      external: [],
      split: false, // Bundle everything together
      maxDuration: 30
    })
  }
};

export default config;
```

### 6. Update admin-dashboard/vite.config.ts
```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: []
    },
    target: 'node22',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    outDir: '.svelte-kit/output'
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

### 7. Update admin-dashboard/.npmrc
```ini
engine-strict=true
public-hoist-pattern[]=@sveltejs/kit
```

## Testing Plan

1. **Local Build Test**: 
   ```bash
   cd admin-dashboard
   pnpm install
   pnpm run build
   ```

2. **Vercel Deployment Test**:
   - Push changes to GitHub
   - Monitor Vercel build logs
   - Verify no module resolution errors

3. **Runtime Verification**:
   - Test dashboard functionality
   - Verify all components load correctly
   - Check API connections work properly

## Expected Outcomes

1. **Fixed Runtime Error**: `ERR_MODULE_NOT_FOUND` for `@sveltejs/kit` will be resolved
2. **Proper Dependency Bundling**: All required packages will be included in serverless functions
3. **Consistent Configuration**: Node.js version and build settings will be unified
4. **Successful Deployment**: Vercel deployment will complete without runtime crashes