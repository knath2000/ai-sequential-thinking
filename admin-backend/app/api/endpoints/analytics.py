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
from ...api.deps.auth import get_current_active_user
from ...services.analytics import AnalyticsService
from ...schemas.analytics import (
    UsageEventCreate, UsageEventResponse,
    PerformanceMetricCreate, PerformanceMetricResponse,
    ErrorLogCreate, ErrorLogResponse,
    CostTrackingCreate, CostTrackingResponse,
    AnalyticsSummary, DashboardMetrics,
    AdminUserResponse
)

router = APIRouter()


@router.post("/events", response_model=UsageEventResponse)
async def create_usage_event(
    event: UsageEventCreate,
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Create a new usage event"""
    service = AnalyticsService(db)
    return service.create_usage_event(event)


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
    current_user: AdminUserResponse = Depends(get_current_active_user)
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
    current_user: AdminUserResponse = Depends(get_current_active_user)
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
    current_user: AdminUserResponse = Depends(get_current_active_user)
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
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get real-time dashboard metrics"""
    service = AnalyticsService(db)
    return service.get_dashboard_metrics()


@router.get("/stream")
async def stream_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
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
