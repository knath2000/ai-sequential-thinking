# Technical Context

## Architecture Overview

### Core System
- **TypeScript Fastify server** with SSE + stdio fallback
- **Modal GPU integration** for LangDB offloading
- **Railway deployment** with webhook integration
- **NeonDB** for analytics storage
- **SvelteKit admin dashboard** with Liquid Glass design

### Key Components
- **MCP Server**: JSON-RPC compliant with streamable HTTP
- **Sequential Thinking Tool**: In-memory state management
- **LangDB Provider**: Modal-offloaded processing with cost tracking
- **Analytics Pipeline**: Railway → Modal → LangDB → Railway
- **Admin Dashboard**: Real-time KPIs and monitoring

### Environment Configuration
- **LANGDB**: Environment variable to enable Modal offloading
- **RAILWAY_ANALYTICS_URL**: Analytics endpoint for cost tracking
- **RAILWAY_ANALYTICS_KEY**: Bearer token for analytics authentication
- **MODAL_WEBHOOK_SECRET**: HMAC verification for webhook security

### API Endpoints
- **Health**: `/health` - Basic health check
- **Capabilities**: `/capabilities` - MCP capabilities
- **Sequential**: `/sequential` - Sequential thinking endpoints
- **Diagnostics**: `/diag/langdb` - LangDB diagnostics
- **Routes**: `/routes` - Registered route auditing
- **Debug**: `/debug/cost-tracking` - Cost tracking debugging

### Deployment Targets
- **Railway**: Primary production deployment
- **Modal**: GPU processing for LangDB
- **Vercel**: Admin dashboard (currently investigating crash)

### Current Technical Issues
- **Vercel Serverless Function Crash**: `ERR_MODULE_NOT_FOUND` for `@sveltejs/kit`
- **Root Cause**: SvelteKit adapter configuration and dependency bundling
- **Status**: Fix plan created in `VERCEL_FIX_PLAN.md`

### Technology Stack
- **Backend**: TypeScript, Fastify, Modal, Railway
- **Frontend**: SvelteKit, TailwindCSS, Chart.js
- **Database**: NeonDB (PostgreSQL)
- **Deployment**: Railway, Vercel, Modal
- **Monitoring**: Custom analytics pipeline with cost tracking
