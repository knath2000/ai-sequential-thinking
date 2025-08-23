# Technical Context

## Architecture Overview

### Core System
- **TypeScript Fastify server** with SSE + stdio fallback
- **Modal GPU integration** for LangDB offloading
- **Railway deployment** with webhook integration
- **NeonDB** for analytics storage
- **SvelteKit admin dashboard** with Liquid Glass design
- **Vercel deployment** for admin dashboard (monorepo configured)

### Key Components
- **MCP Server**: JSON-RPC compliant with streamable HTTP
- **Sequential Thinking Tool**: In-memory state management
- **LangDB Provider**: Modal-offloaded processing with cost tracking
- **Analytics Pipeline**: Railway → Modal → LangDB → Railway
- **Admin Dashboard**: Real-time KPIs and monitoring
- **Vercel Deployment**: SvelteKit admin dashboard successfully deployed

### Environment Configuration
- **LANGDB**: Environment variable to enable Modal offloading
- **RAILWAY_ANALYTICS_URL**: Analytics endpoint for cost tracking
- **RAILWAY_ANALYTICS_KEY**: Bearer token for analytics authentication
- **MODAL_WEBHOOK_SECRET**: HMAC verification for webhook security
- **VERCEL_ROOT_DIRECTORY**: Set to `admin-dashboard` for monorepo deployment

### API Endpoints
- **Health**: `/health` - Basic health check
- **Capabilities**: `/capabilities` - MCP capabilities
- **Sequential**: `/sequential` - Sequential thinking endpoints
- **Diagnostics**: `/diag/langdb` - LangDB diagnostics
- **Routes**: `/routes` - Registered route auditing
- **Debug**: `/debug/cost-tracking` - Cost tracking debugging

### Deployment Targets
- ✅ **Railway**: Primary production deployment
- ✅ **Modal**: GPU processing for LangDB
- ✅ **Vercel**: Admin dashboard (monorepo successfully configured)

### Current Technical Status
- ✅ **Vercel Serverless Function Crash**: Successfully resolved
- ✅ **Monorepo Configuration**: Vercel root directory set to `admin-dashboard`
- ✅ **Build Process**: SvelteKit build now working correctly
- ✅ **Deployment**: All platforms operational

### Technology Stack
- **Backend**: TypeScript, Fastify, Modal, Railway
- **Frontend**: SvelteKit, TailwindCSS, Chart.js
- **Database**: NeonDB (PostgreSQL)
- **Deployment**: Railway, Vercel, Modal
- **Monitoring**: Custom analytics pipeline with cost tracking

### Monorepo Configuration
- **Root Directory**: `admin-dashboard` (Vercel setting)
- **Build Command**: Uses admin-dashboard's `pnpm run build`
- **Framework**: SvelteKit with adapter-vercel
- **Dependencies**: Properly scoped to admin-dashboard package.json
