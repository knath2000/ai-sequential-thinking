# Vercel Deployment Fix Instructions

## 🚨 CRITICAL: Vercel Dashboard Configuration Required

The `ERR_MODULE_NOT_FOUND: @sveltejs/kit` error is primarily caused by Vercel building from the wrong directory. This **MUST** be configured in the Vercel dashboard.

### Step 1: Vercel Dashboard Configuration

1. **Go to Vercel Dashboard** → Select your project
2. **Navigate to Settings** → **General**
3. **Find "Root Directory"** section
4. **Change from** `/` **to** `admin-dashboard`
5. **Save changes**

### Step 2: Verify Build Settings

In the same Settings → General page, ensure these settings:

- **Build Command**: `pnpm run build`
- **Install Command**: `pnpm install --no-frozen-lockfile`
- **Framework Preset**: SvelteKit
- **Node.js Version**: 22.x

### Step 3: Environment Variables (if needed)

In Settings → Environment Variables, ensure these are set:

- `NODE_ENV`: `production`
- Any other required environment variables for your application

### Step 4: Deploy Changes

1. **Commit and push** the configuration changes
2. **Trigger a new deployment** in Vercel
3. **Monitor build logs** for success

## Local Testing (Optional but Recommended)

Before deploying, test locally:

```bash
cd admin-dashboard
rm -rf .svelte-kit .vercel build
pnpm install
pnpm run build
```

## Troubleshooting

If the error persists after dashboard configuration:

1. **Clear Vercel cache**: Go to Deployments → Redeploy with cache cleared
2. **Check package.json**: Ensure `@sveltejs/kit` is in dependencies (already verified)
3. **Verify pnpm workspace**: Ensure pnpm-workspace.yaml is correctly configured

## Root Cause

The error occurs because:
- Vercel builds from repository root instead of `admin-dashboard/`
- `@sveltejs/kit` is installed in `admin-dashboard/node_modules/` but not found when building from root
- Complex vercel.json configurations interfere with dependency resolution

## Files Updated

- ✅ `admin-dashboard/vercel.json` - Simplified configuration
- ✅ `admin-dashboard/svelte.config.js` - Simplified adapter configuration
- ✅ `VERCEL_DEPLOYMENT_INSTRUCTIONS.md` - Complete deployment guide