"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from ..core.config import settings
from ..services.analytics import AnalyticsService
from ..models.analytics import ErrorLogCreate

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def log_db_error(db: Session, error: Exception, context: dict | None = None):
    """Log database errors to the error_logs table."""
    try:
        service = AnalyticsService(db)
        error_log = ErrorLogCreate(
            error_type=error.__class__.__name__,
            error_message=str(error),
            stack_trace=getattr(error, '__traceback__', None) and str(error.__traceback__) or None,
            context=context or {}
        )
        await service.create_error_log(error_log)
    except Exception as e:
        # Fallback to console if logging to DB fails
        print(f"[ERROR] Failed to log DB error: {e}")
