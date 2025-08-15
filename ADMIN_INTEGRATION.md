# Admin Backend Integration Guide

This guide explains how to integrate the existing ai-sequential-thinking MCP server with the new admin backend for comprehensive analytics and monitoring.

## 🔧 Environment Configuration

Add these environment variables to your MCP server deployment (Railway):

```bash
# Admin Backend Integration
ADMIN_BACKEND_URL=https://your-admin-backend.railway.app
ADMIN_API_KEY=your-admin-backend-jwt-token

# Optional: Disable analytics if needed
ANALYTICS_ENABLED=true
```

## 🏗️ Integration Features Added

### 1. Analytics Client (`src/services/analyticsClient.ts`)
- **Usage Events**: Tool calls, response times, success/failure rates
- **Performance Metrics**: System performance tracking
- **Error Logging**: Comprehensive error tracking with context
- **Cost Tracking**: LangDB and Modal service costs
- **Webhook Events**: Modal webhook processing analytics

### 2. Router Integration (`src/router.ts`)
Enhanced the existing router with analytics tracking for:
- ✅ **Tool Call Analytics**: Every `sequential_thinking` tool call
- ✅ **Modal Job Tracking**: Success/failure of Modal submissions
- ✅ **Webhook Analytics**: Modal webhook processing events
- ✅ **Error Tracking**: All error conditions with context
- ✅ **Performance Monitoring**: Response times and processing metrics

### 3. Data Collection Points

The integration automatically tracks:

#### Tool Usage Events
```typescript
{
  session_id: "session-uuid",
  event_type: "tool_call",
  tool_name: "sequential_thinking",
  response_time_ms: 1500,
  success: true,
  metadata: {
    used_modal: true,
    correlation_id: "modal-job-id",
    steps_count: 3,
    model: "o4-mini-high"
  }
}
```

#### Webhook Events
```typescript
{
  session_id: "correlation-uuid",
  event_type: "webhook",
  tool_name: "modal_webhook",
  response_time_ms: 250,
  success: true,
  metadata: {
    has_correlation_id: true,
    has_waiter: true,
    result_size: 1024
  }
}
```

#### Error Tracking
```typescript
{
  session_id: "session-uuid",
  error_type: "modal_submission_failed",
  error_message: "Connection timeout",
  context: {
    tool_name: "sequential_thinking",
    model: "o4-mini-high",
    used_modal: true
  }
}
```

## 🚀 Deployment Steps

### 1. Deploy Admin Backend
```bash
cd admin-backend
railway login
railway init
railway add postgresql redis
railway deploy
```

### 2. Create Admin User
```bash
# On admin backend
python manage.py create-admin --username admin --email admin@example.com --superuser
```

### 3. Get API Token
```bash
# Login to get JWT token
curl -X POST https://your-admin-backend.railway.app/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=your-password"
```

### 4. Configure MCP Server
Add environment variables to your MCP server's Railway deployment:
- `ADMIN_BACKEND_URL`: Your admin backend URL
- `ADMIN_API_KEY`: JWT token from login

### 5. Deploy Updated MCP Server
```bash
# Build and push changes
pnpm build
git add .
git commit -m "feat: add admin backend analytics integration"
git push origin main
```

## 📊 Analytics Dashboard

Once integrated, the admin backend provides:

### Real-time Metrics
- **Requests per minute**: Live tool usage
- **Success rate**: Tool call success percentage
- **Average response time**: Performance monitoring
- **Active sessions**: Current user activity
- **Cost tracking**: Daily spending on LangDB/Modal

### Historical Analytics
- **Usage patterns**: Tool usage over time
- **Error trends**: Error rates and types
- **Performance trends**: Response time evolution
- **Cost analysis**: Service spending breakdown

### Error Monitoring
- **Error logs**: Detailed error tracking
- **Error resolution**: Mark errors as resolved
- **Error patterns**: Common failure modes
- **Stack traces**: Debugging information

## 🔍 Monitoring Endpoints

### Admin Backend APIs
- `GET /api/v1/analytics/dashboard` - Real-time dashboard data
- `GET /api/v1/analytics/summary` - Historical summary
- `GET /api/v1/analytics/events` - Usage events with filtering
- `GET /api/v1/analytics/errors` - Error logs
- `GET /api/v1/analytics/costs/summary` - Cost analysis

### MCP Server Health
- `GET /health` - Basic health check
- `GET /diag` - Diagnostic information
- `POST /diag/langdb` - LangDB connectivity test

## 🔒 Security

### Authentication
- JWT-based authentication for admin backend
- HMAC signature verification for webhooks
- API key authentication for analytics data

### Data Privacy
- Session IDs used for tracking (not personal data)
- Error messages sanitized in logs
- API keys never logged or exposed

## 🧪 Testing Integration

### 1. Test Analytics Flow
```bash
# Make a test request to MCP server
curl -X POST https://your-mcp-server.railway.app/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "sequential_thinking",
      "arguments": {
        "thought": "test thought",
        "thought_number": 1,
        "total_thoughts": 1,
        "next_thought_needed": false
      }
    }
  }'
```

### 2. Verify Data in Admin Backend
```bash
# Check analytics data
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-admin-backend.railway.app/api/v1/analytics/events
```

### 3. Monitor Logs
- Check MCP server logs for analytics client messages
- Check admin backend logs for incoming analytics data
- Verify no errors in data collection

## 🚨 Troubleshooting

### Common Issues

1. **Analytics Not Appearing**
   - Check `ADMIN_BACKEND_URL` and `ADMIN_API_KEY` environment variables
   - Verify admin backend is deployed and accessible
   - Check JWT token validity

2. **Authentication Errors**
   - Regenerate JWT token if expired
   - Verify API key format and encoding
   - Check admin backend authentication endpoints

3. **Missing Data**
   - Verify analytics client is not throwing errors
   - Check database connectivity in admin backend
   - Review PostgreSQL logs for connection issues

4. **Performance Impact**
   - Analytics calls are async and non-blocking
   - Failed analytics calls don't affect main functionality
   - Monitor response times before/after integration

### Debug Commands
```bash
# Check MCP server analytics integration
curl https://your-mcp-server.railway.app/health

# Check admin backend health
curl https://your-admin-backend.railway.app/health

# View analytics data
curl -H "Authorization: Bearer JWT_TOKEN" \
  https://your-admin-backend.railway.app/api/v1/analytics/dashboard
```

## 📈 Benefits

### For Operations
- **Proactive Monitoring**: Early detection of issues
- **Performance Insights**: Optimize response times
- **Cost Management**: Track and control service spending
- **Usage Analytics**: Understand user behavior

### For Development
- **Error Tracking**: Faster debugging and resolution
- **Performance Profiling**: Identify bottlenecks
- **Feature Usage**: Data-driven development decisions
- **System Health**: Comprehensive system monitoring

### For Business
- **Usage Metrics**: Service adoption and growth
- **Cost Analysis**: ROI and efficiency metrics
- **Quality Metrics**: Success rates and reliability
- **Capacity Planning**: Scale based on usage patterns
