"""
FastAPI Admin Backend for ai-sequential-thinking MCP Server
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .core.config import settings
from .db.database import engine, Base
from .api.endpoints import auth, analytics, admin


# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


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
    lifespan=lifespan
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"REQ {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"RES {request.method} {request.url.path} -> {response.status_code}")
    return response

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
