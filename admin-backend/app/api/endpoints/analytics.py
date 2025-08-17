"""
Analytics endpoints for MCP server data
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.responses import StreamingResponse
import asyncio
from sqlalchemy.orm import Session
from ...db.database import get_db
from ...api.deps.auth import get_current_active_user, get_ingest_or_user
from ...core.config import settings
from ...services.analytics import AnalyticsService
from ...schemas.analytics import (
    UsageEventCreate, UsageEventResponse,
    PerformanceMetricCreate, PerformanceMetricResponse,
    ErrorLogCreate, ErrorLogResponse,
    CostTrackingCreate, CostTrackingResponse,
    AnalyticsSummary, DashboardMetrics,
    AdminUserResponse,
    SessionCreate, SessionResponse, SessionDetailResponse,
)
import logging
from ...core.log_buffer import InMemoryLogHandler

router = APIRouter()


@router.post("/events", response_model=UsageEventResponse)
async def create_usage_event(
    event: UsageEventCreate,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_ingest_or_user)
):
    """Create a new usage event"""
    service = AnalyticsService(db)
    return service.create_usage_event(event)


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_ingest_or_user)
):
    """Create or return existing session"""
    service = AnalyticsService(db)
    return service.create_session(session)


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_current_active_user) if not settings.ANALYTICS_PUBLIC_READ else None
):
    """List sessions (most recent first)."""
    from ...models.analytics import Session as SessionModel
    q = db.query(SessionModel).order_by(SessionModel.created_at.desc()).offset(skip).limit(limit).all()
    return [SessionResponse.from_orm(s) for s in q]


@router.get("/events", response_model=List[UsageEventResponse])
async def get_usage_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get usage events with filtering"""
    service = AnalyticsService(db)
    return service.get_usage_events(
        skip=skip,
        limit=limit,
        session_id=session_id,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date
    )


@router.post("/metrics", response_model=PerformanceMetricResponse)
async def create_performance_metric(
    metric: PerformanceMetricCreate,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_ingest_or_user)
):
    """Create a new performance metric"""
    service = AnalyticsService(db)
    return service.create_performance_metric(metric)


@router.get("/metrics", response_model=List[PerformanceMetricResponse])
async def get_performance_metrics(
    metric_name: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get performance metrics with filtering"""
    service = AnalyticsService(db)
    return service.get_performance_metrics(
        metric_name=metric_name,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )


@router.post("/errors", response_model=ErrorLogResponse)
async def create_error_log(
    error: ErrorLogCreate,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_ingest_or_user)
):
    """Create a new error log"""
    service = AnalyticsService(db)
    return service.create_error_log(error)


@router.get("/errors", response_model=List[ErrorLogResponse])
async def get_error_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    error_type: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get error logs with filtering"""
    service = AnalyticsService(db)
    return service.get_error_logs(
        skip=skip,
        limit=limit,
        error_type=error_type,
        resolved=resolved,
        start_date=start_date,
        end_date=end_date
    )


@router.post("/costs", response_model=CostTrackingResponse)
async def create_cost_tracking(
    cost: CostTrackingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_ingest_or_user)
):
    """Create a new cost tracking entry"""
    service = AnalyticsService(db)
    return service.create_cost_tracking(cost)


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    start_date: Optional[datetime] = Query(None, description="Start date for summary"),
    end_date: Optional[datetime] = Query(None, description="End date for summary"),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get comprehensive analytics summary"""
    service = AnalyticsService(db)
    return service.get_analytics_summary(start_date=start_date, end_date=end_date)


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_current_active_user) if not settings.ANALYTICS_PUBLIC_READ else None
):
    """Get real-time dashboard metrics"""
    service = AnalyticsService(db)
    return service.get_dashboard_metrics()



@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_current_active_user) if not settings.ANALYTICS_PUBLIC_READ else None
):
    """Get detailed information for a single session: session metadata, events, metrics and logs."""
    service = AnalyticsService(db)
    detail = service.get_session_detail(session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@router.get("/stream")
async def stream_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: Optional[AdminUserResponse] = Depends(get_current_active_user) if not settings.ANALYTICS_PUBLIC_READ else None
):
    """SSE stream for real-time dashboard metrics"""
    service = AnalyticsService(db)

    async def event_generator():
        while True:
            metrics = service.get_dashboard_metrics()
            payload = AnalyticsSummary.model_json_schema()  # dummy to ensure pydantic import use
            data = DashboardMetrics(**metrics.dict()).model_dump_json()
            yield f"data: {data}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/logs")
async def get_recent_logs(
    limit: int = Query(200, ge=1, le=2000),
    level: Optional[str] = Query(None),
    current_user: Optional[AdminUserResponse] = Depends(get_current_active_user) if not settings.ANALYTICS_PUBLIC_READ else None
):
    """Return recent application logs for dashboard viewing."""
    entries = []
    for h in logging.getLogger().handlers:
        if isinstance(h, InMemoryLogHandler):
            entries = h.get_recent(limit=limit, level=level)
            break
    return [
        {"ts": e.ts.isoformat() + "Z", "level": e.level, "name": e.name, "message": e.message}
        for e in entries
    ]


@router.get("/costs/summary")
async def get_cost_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    service_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get cost summary with aggregations"""
    service = AnalyticsService(db)
    return service.get_cost_summary(
        start_date=start_date,
        end_date=end_date,
        service_name=service_name
    )


@router.get("/diag/error-logs")
async def get_recent_error_logs(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Return recent error logs for diagnostic viewing."""
    service = AnalyticsService(db)
    recent_errors = service.get_error_logs(skip=0, limit=limit)
    return {"ok": True, "count": len(recent_errors), "errors": recent_errors}
