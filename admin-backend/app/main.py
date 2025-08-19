"""
FastAPI Admin Backend for ai-sequential-thinking MCP Server
"""
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response # Import Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .core.config import settings
from .core.log_buffer import InMemoryLogHandler
from .db.database import engine, get_db
from .db.base import Base
from .api.endpoints import auth, analytics, admin


# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Define exception handling middleware function first
# This middleware will catch exceptions and apply CORS headers manually
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except HTTPException as http_exc:
        # Handle FastAPI HTTP exceptions
        response = JSONResponse(
            status_code=http_exc.status_code,
            content={"detail": http_exc.detail}
        )
        # Manually add CORS headers
        origin = request.headers.get('origin')
        if origin and origin in settings.BACKEND_CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    except Exception as e:
        # Handle all other exceptions
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
        
        # Manually add CORS headers for error responses
        origin = request.headers.get('origin')
        if origin and origin in settings.BACKEND_CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting MCP Admin Backend...")
    try:
        # Create database tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        
    yield
    
    # Shutdown
    logger.info("Shutting down MCP Admin Backend...")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Administrative backend for ai-sequential-thinking MCP Server",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
    debug=True # Enable debug mode for better error visibility
)

# Order of middleware is important: Exception handler first, then CORS
app.middleware("http")(catch_exceptions_middleware) # Custom exception handler middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Attach in-memory log handler for dashboard retrieval
_inmem_handler = InMemoryLogHandler(capacity=2000)
_inmem_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logging.getLogger().addHandler(_inmem_handler)

# Simple request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"REQ {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"RES {request.method} {request.url.path} -> {response.status_code}")
        # If 401, attempt to log auth failure details asynchronously
        if response.status_code == 401:
            try:
                # Extract headers and client ip
                headers = dict(request.headers)
                client_ip = request.client.host if request.client else ''
                # Fire-and-forget logging to DB
                from .db.database import SessionLocal
                from .services.analytics import AnalyticsService
                db = SessionLocal()
                try:
                    svc = AnalyticsService(db)
                    svc.log_auth_failure(str(request.url.path), headers, client_ip, 401, {})
                finally:
                    db.close()
            except Exception:
                logger.exception('Failed to log auth failure')
        return response
    except Exception as e:
        logger.exception('Error in request middleware')
        raise

# Mount static files (robust path resolution)
try:
    # main.py is in admin-backend/app; static is at admin-backend/static
    static_path = (Path(__file__).resolve().parent.parent / "static").resolve()
    if static_path.exists() and static_path.is_dir():
        app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
        logger.info(f"Mounted static files directory at: {static_path}")
    else:
        logger.warning(f"Static directory not found at {static_path}. Skipping static mount.")
except Exception as e:
    logger.error(f"Failed to mount static files: {e}")

# Mount SvelteKit dashboard build at /dashboard (if present)
try:
    # repoRoot/admin-dashboard/build
    dashboard_build_path = (
        Path(__file__).resolve().parent.parent.parent / "admin-dashboard" / "build"
    ).resolve()
    if dashboard_build_path.exists() and dashboard_build_path.is_dir():
        app.mount("/dashboard", StaticFiles(directory=str(dashboard_build_path), html=True), name="dashboard")
        logger.info(f"Mounted dashboard at: {dashboard_build_path}")
    else:
        logger.warning(f"Dashboard build not found at {dashboard_build_path}. Skipping dashboard mount.")
except Exception as e:
    logger.error(f"Failed to mount dashboard: {e}")

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MCP Admin Backend",
        "version": settings.PROJECT_VERSION,
        "docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.PROJECT_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
