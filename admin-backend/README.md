# MCP Admin Backend

Administrative backend for the ai-sequential-thinking MCP Server. Provides comprehensive analytics, logging, cost tracking, and real-time monitoring capabilities.

## 🎯 Features

### Core Administration
- **JWT Authentication** - Secure access with role-based permissions
- **User Management** - Admin and superuser roles
- **Real-time Analytics** - Live dashboard with performance metrics
- **Cost Tracking** - Monitor LangDB and Modal service costs
- **Error Logging** - Comprehensive error tracking and resolution
- **Session Management** - Track user sessions and activities

### Data Collection & Analytics
- **Usage Events** - Track tool calls, response times, success rates
- **Performance Metrics** - Monitor system performance over time
- **Cost Analysis** - Track spending across external services
- **Error Monitoring** - Real-time error detection and alerting
- **Session Analytics** - User behavior and usage patterns

### Integration Features
- **MCP Server Hooks** - Automatic data collection from existing server
- **WebSocket Support** - Real-time dashboard updates
- **PostgreSQL + TimescaleDB** - Optimized time-series analytics
- **Redis Caching** - Fast session management and real-time data
- **Railway Deployment** - Production-ready cloud hosting

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL with TimescaleDB extension
- Redis (optional, for caching)

### Installation

1. **Clone and setup:**
```bash
cd admin-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment configuration:**
```bash
cp env.example .env
# Edit .env with your database and service credentials
```

3. **Database setup:**
```bash
# Initialize database
python manage.py init-db

# Create admin user
python manage.py create-admin --username admin --email admin@example.com --superuser
```

4. **Run migrations (optional):**
```bash
alembic upgrade head
```

5. **Start development server:**
```bash
python manage.py serve
# Or directly: uvicorn app.main:app --reload
```

## 📊 API Documentation

### Authentication
- `POST /api/v1/auth/login` - Login and get JWT token

### Analytics Endpoints
- `POST /api/v1/analytics/events` - Create usage event
- `GET /api/v1/analytics/events` - Get usage events with filtering
- `POST /api/v1/analytics/metrics` - Create performance metric
- `GET /api/v1/analytics/metrics` - Get performance metrics
- `POST /api/v1/analytics/errors` - Create error log
- `GET /api/v1/analytics/errors` - Get error logs
- `POST /api/v1/analytics/costs` - Create cost tracking entry
- `GET /api/v1/analytics/summary` - Get analytics summary
- `GET /api/v1/analytics/dashboard` - Get real-time dashboard metrics

### Admin Management
- `POST /api/v1/admin/users` - Create admin user (superuser only)
- `GET /api/v1/admin/users` - List admin users
- `GET /api/v1/admin/users/me` - Get current user info
- `PUT /api/v1/admin/users/{user_id}` - Update admin user
- `DELETE /api/v1/admin/users/{user_id}` - Delete admin user

## 🏗️ Architecture

### Directory Structure
```
admin-backend/
├── app/
│   ├── api/               # API endpoints and dependencies
│   │   ├── deps/          # Authentication and other dependencies
│   │   └── endpoints/     # Route handlers
│   ├── core/              # Core configuration and security
│   ├── db/                # Database configuration
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic services
├── alembic/               # Database migrations
├── static/                # Static files (CSS, JS, images)
├── templates/             # Jinja2 templates
├── tests/                 # Test suite
└── manage.py              # Management CLI
```

### Database Models

**UsageEvent** - Track individual tool usage
- session_id, event_type, tool_name
- response_time_ms, success, error_message
- metadata (JSON for additional data)

**PerformanceMetric** - Time-series performance data
- metric_name, metric_value, metric_unit
- tags (JSON for filtering)

**ErrorLog** - Error tracking and resolution
- error_type, error_message, stack_trace
- resolved flag and resolution timestamp

**Session** - User session tracking
- session_id, total_requests, total_errors
- processing times and metadata

**CostTracking** - Service cost monitoring
- service_name (langdb, modal, etc.)
- operation_type, tokens_used, cost_usd

**AdminUser** - Authentication and user management
- username, email, hashed_password
- is_active, is_superuser flags

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mcp_admin
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# MCP Server Integration
MCP_SERVER_URL=https://your-mcp-server.railway.app
MCP_WEBHOOK_SECRET=your-webhook-secret

# External Services
LANGDB_API_KEY=your-langdb-key
MODAL_API_TOKEN=your-modal-token

# Deployment
DEBUG=False
LOG_LEVEL=INFO
```

### TimescaleDB Setup

For optimal time-series performance, enable TimescaleDB:

```sql
-- Connect to your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert tables to hypertables (after creating tables)
SELECT create_hypertable('usage_events', 'timestamp');
SELECT create_hypertable('performance_metrics', 'timestamp');
SELECT create_hypertable('error_logs', 'timestamp');
SELECT create_hypertable('cost_tracking', 'timestamp');
```

## 🚀 Railway Deployment

### 1. Prepare for deployment:
```bash
# Create requirements.txt if needed
pip freeze > requirements.txt

# Create Procfile
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

### 2. Deploy to Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add postgresql redis
railway deploy
```

### 3. Configure environment variables in Railway dashboard:
- Set all required environment variables
- Configure database connection strings
- Set up webhook secrets

## 📈 Integration with MCP Server

### Data Collection Hooks

To integrate with the existing MCP server, add these hooks to your MCP server code:

```typescript
// Add to your MCP server's router.ts
import axios from 'axios';

const ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function logUsageEvent(eventData: any) {
  if (!ADMIN_BACKEND_URL) return;
  
  try {
    await axios.post(`${ADMIN_BACKEND_URL}/api/v1/analytics/events`, eventData, {
      headers: { 'Authorization': `Bearer ${ADMIN_API_KEY}` }
    });
  } catch (error) {
    console.warn('Failed to log usage event:', error.message);
  }
}

// Add to your tool execution logic
await logUsageEvent({
  session_id: req.headers['x-session-id'],
  event_type: 'tool_call',
  tool_name: 'sequential_thinking',
  response_time_ms: Date.now() - startTime,
  success: true,
  metadata: { /* additional data */ }
});
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_analytics.py
```

## 📝 Management Commands

```bash
# Database management
python manage.py init-db                    # Initialize database
python manage.py create-admin               # Create admin user
python manage.py list-admins                # List all admin users
python manage.py delete-admin               # Delete admin user

# Development
python manage.py serve                      # Start development server
```

## 🔍 Monitoring & Debugging

### Health Checks
- `GET /health` - Basic health check
- `GET /api/v1/analytics/dashboard` - Real-time system metrics

### Logging
The application logs to stdout/stderr with configurable levels:
- ERROR: Critical errors requiring immediate attention
- WARN: Important warnings and potential issues
- INFO: General application flow and important events
- DEBUG: Detailed debugging information

### API Documentation
- `GET /api/v1/docs` - Interactive Swagger UI
- `GET /api/v1/redoc` - Alternative API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/api/v1/docs`
2. Review logs for error details
3. Ensure all environment variables are set correctly
4. Verify database connectivity and migrations
