# Vercel Monorepo Setup Guide

## Problem Solved
The `rootDirectory` property is invalid in `vercel.json`. This guide provides the correct approach for monorepo deployment.

## Correct Configuration Approach

### 1. Vercel.json (Valid Schema)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "framework": "sveltekit",
  "devCommand": "pnpm run dev",
  "outputDirectory": ".svelte-kit/output",
  "functions": {
    "index.js": {
      "runtime": "nodejs22.x",
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Vercel Dashboard Configuration (Required)
Instead of using `rootDirectory` in `vercel.json`, configure the root directory in Vercel dashboard:

#### Method 1: Vercel CLI (Recommended)
```bash
# From repository root
vercel --prod --cwd admin-dashboard

# Or configure project settings
vercel project add admin-dashboard --root-directory admin-dashboard
```

#### Method 2: Vercel Dashboard
1. Go to your Vercel project settings
2. Navigate to "General" → "Root Directory"
3. Set to: `admin-dashboard`
4. Save settings

#### Method 3: During Initial Setup
```bash
# When running vercel init
vercel
# When prompted for root directory, enter: admin-dashboard
```

### 3. Project Structure Requirements
```
ai-thinking-mcp/
├── admin-dashboard/
│   ├── package.json          # Must contain all dependencies
│   ├── vercel.json          # Valid schema only
│   ├── svelte.config.js     # Monorepo-aware config
│   └── ... other files
├── pnpm-workspace.yaml      # Workspace configuration
└── ... other packages
```

### 4. Package.json Requirements
Ensure `admin-dashboard/package.json` contains:
- All required dependencies (@sveltejs/kit, @sveltejs/adapter-vercel, etc.)
- Proper build scripts
- Correct framework specification

### 5. Build Verification
```bash
# Test locally
cd admin-dashboard
pnpm install
pnpm run build

# Test with Vercel CLI
vercel --cwd admin-dashboard
```

## Common Issues and Solutions

### Issue: "Cannot find package '@sveltejs/kit'"
**Solution**: Ensure all dependencies are in `admin-dashboard/package.json`, not root package.json

### Issue: "Build Failed - Schema validation"
**Solution**: Remove invalid properties from `vercel.json` and use dashboard configuration

### Issue: "Framework detection failed"
**Solution**: Ensure `framework` is explicitly set to "sveltekit" in `vercel.json`

## Deployment Commands

### For New Projects
```bash
vercel --cwd admin-dashboard
```

### For Existing Projects
```bash
# Update project settings
vercel project update --root-directory admin-dashboard

# Deploy
vercel --prod --cwd admin-dashboard
```

## Verification Checklist
- [ ] `vercel.json` contains only valid schema properties
- [ ] All dependencies are in `admin-dashboard/package.json`
- [ ] Vercel dashboard has root directory set to `admin-dashboard`
- [ ] Build completes successfully locally
- [ ] Framework is correctly detected as SvelteKit