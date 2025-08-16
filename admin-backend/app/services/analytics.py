"""
Analytics service for processing and aggregating MCP server data
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from ..models.analytics import (
    UsageEvent, PerformanceMetric, ErrorLog, 
    Session as SessionModel, CostTracking
)
from ..schemas.analytics import (
    UsageEventCreate, UsageEventResponse,
    PerformanceMetricCreate, PerformanceMetricResponse,
    ErrorLogCreate, ErrorLogResponse,
    SessionCreate, SessionUpdate, SessionResponse,
    CostTrackingCreate, CostTrackingResponse,
    AnalyticsSummary, DashboardMetrics
)


class AnalyticsService:
    """Service for managing analytics data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Usage Events
    def create_usage_event(self, event_data: UsageEventCreate) -> UsageEventResponse:
        """Create a new usage event"""
        db_event = UsageEvent(**event_data.dict())
        self.db.add(db_event)
        self.db.commit()
        self.db.refresh(db_event)
        return UsageEventResponse.from_orm(db_event)
    
    def get_usage_events(
        self, 
        skip: int = 0, 
        limit: int = 100,
        session_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[UsageEventResponse]:
        """Get usage events with filtering"""
        query = self.db.query(UsageEvent)
        
        if session_id:
            query = query.filter(UsageEvent.session_id == session_id)
        if event_type:
            query = query.filter(UsageEvent.event_type == event_type)
        if start_date:
            query = query.filter(UsageEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(UsageEvent.timestamp <= end_date)
        
        events = query.order_by(desc(UsageEvent.timestamp)).offset(skip).limit(limit).all()
        return [UsageEventResponse.from_orm(event) for event in events]

    def get_session_detail(self, session_id: str) -> Dict[str, Any]:
        """Return session row + recent events and metrics for a given session."""
        out: Dict[str, Any] = {}
        sess = self.db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
        if not sess:
            return out
        out["session"] = SessionResponse.from_orm(sess)
        ev = self.db.query(UsageEvent).filter(UsageEvent.session_id == session_id).order_by(desc(UsageEvent.timestamp)).limit(100).all()
        out["events"] = [UsageEventResponse.from_orm(e) for e in ev]
        # For metrics, we currently don't associate by session_id, but include recent global metrics for context
        mets = self.db.query(PerformanceMetric).order_by(desc(PerformanceMetric.timestamp)).limit(100).all()
        out["metrics"] = [PerformanceMetricResponse.from_orm(m) for m in mets]
        return out
    
    # Performance Metrics
    def create_performance_metric(self, metric_data: PerformanceMetricCreate) -> PerformanceMetricResponse:
        """Create a new performance metric"""
        db_metric = PerformanceMetric(**metric_data.dict())
        self.db.add(db_metric)
        self.db.commit()
        self.db.refresh(db_metric)
        return PerformanceMetricResponse.from_orm(db_metric)
    
    def get_performance_metrics(
        self,
        metric_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[PerformanceMetricResponse]:
        """Get performance metrics with filtering"""
        query = self.db.query(PerformanceMetric)
        
        if metric_name:
            query = query.filter(PerformanceMetric.metric_name == metric_name)
        if start_date:
            query = query.filter(PerformanceMetric.timestamp >= start_date)
        if end_date:
            query = query.filter(PerformanceMetric.timestamp <= end_date)
        
        metrics = query.order_by(desc(PerformanceMetric.timestamp)).limit(limit).all()
        return [PerformanceMetricResponse.from_orm(metric) for metric in metrics]
    
    # Error Logs
    def create_error_log(self, error_data: ErrorLogCreate) -> ErrorLogResponse:
        """Create a new error log"""
        db_error = ErrorLog(**error_data.dict())
        self.db.add(db_error)
        self.db.commit()
        self.db.refresh(db_error)
        return ErrorLogResponse.from_orm(db_error)
    
    def get_error_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        error_type: Optional[str] = None,
        resolved: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ErrorLogResponse]:
        """Get error logs with filtering"""
        query = self.db.query(ErrorLog)
        
        if error_type:
            query = query.filter(ErrorLog.error_type == error_type)
        if resolved is not None:
            query = query.filter(ErrorLog.resolved == resolved)
        if start_date:
            query = query.filter(ErrorLog.timestamp >= start_date)
        if end_date:
            query = query.filter(ErrorLog.timestamp <= end_date)
        
        errors = query.order_by(desc(ErrorLog.timestamp)).offset(skip).limit(limit).all()
        return [ErrorLogResponse.from_orm(error) for error in errors]
    
    # Sessions
    def create_session(self, session_data: SessionCreate) -> SessionResponse:
        """Create a new session"""
        # Idempotent create: return existing if present
        existing = self.db.query(SessionModel).filter(
            SessionModel.session_id == session_data.session_id
        ).first()
        if existing:
            return SessionResponse.from_orm(existing)
        db_session = SessionModel(**session_data.dict())
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return SessionResponse.from_orm(db_session)
    
    def update_session(self, session_id: str, session_data: SessionUpdate) -> Optional[SessionResponse]:
        """Update an existing session"""
        db_session = self.db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        
        if not db_session:
            return None
        
        update_data = session_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_session, field, value)
        
        self.db.commit()
        self.db.refresh(db_session)
        return SessionResponse.from_orm(db_session)
    
    # Cost Tracking
    def create_cost_tracking(self, cost_data: CostTrackingCreate) -> CostTrackingResponse:
        """Create a new cost tracking entry"""
        db_cost = CostTracking(**cost_data.dict())
        self.db.add(db_cost)
        self.db.commit()
        self.db.refresh(db_cost)
        return CostTrackingResponse.from_orm(db_cost)
    
    def get_cost_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        service_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get cost summary with aggregations"""
        query = self.db.query(
            func.sum(CostTracking.cost_usd).label("total_cost"),
            func.sum(CostTracking.tokens_used).label("total_tokens"),
            func.count(CostTracking.id).label("total_requests")
        )
        
        if start_date:
            query = query.filter(CostTracking.timestamp >= start_date)
        if end_date:
            query = query.filter(CostTracking.timestamp <= end_date)
        if service_name:
            query = query.filter(CostTracking.service_name == service_name)
        
        result = query.first()
        return {
            "total_cost_usd": float(result.total_cost or 0),
            "total_tokens": int(result.total_tokens or 0),
            "total_requests": int(result.total_requests or 0)
        }
    
    # Analytics Summaries
    def get_analytics_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AnalyticsSummary:
        """Get comprehensive analytics summary"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Total requests
        total_requests = self.db.query(func.count(UsageEvent.id)).filter(
            UsageEvent.timestamp >= start_date,
            UsageEvent.timestamp <= end_date
        ).scalar() or 0
        
        # Success rate
        successful_requests = self.db.query(func.count(UsageEvent.id)).filter(
            UsageEvent.timestamp >= start_date,
            UsageEvent.timestamp <= end_date,
            UsageEvent.success == True
        ).scalar() or 0
        
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Average response time
        avg_response_time = self.db.query(
            func.avg(UsageEvent.response_time_ms)
        ).filter(
            UsageEvent.timestamp >= start_date,
            UsageEvent.timestamp <= end_date,
            UsageEvent.response_time_ms.isnot(None)
        ).scalar() or 0
        
        # Total costs
        total_costs = self.db.query(
            func.sum(CostTracking.cost_usd)
        ).filter(
            CostTracking.timestamp >= start_date,
            CostTracking.timestamp <= end_date
        ).scalar() or 0
        
        # Active sessions
        active_sessions = self.db.query(func.count(SessionModel.id)).filter(
            SessionModel.ended_at.is_(None)
        ).scalar() or 0
        
        # Error rate
        total_errors = self.db.query(func.count(ErrorLog.id)).filter(
            ErrorLog.timestamp >= start_date,
            ErrorLog.timestamp <= end_date
        ).scalar() or 0
        
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
        
        # Top tools
        top_tools_query = self.db.query(
            UsageEvent.tool_name,
            func.count(UsageEvent.id).label("count")
        ).filter(
            UsageEvent.timestamp >= start_date,
            UsageEvent.timestamp <= end_date,
            UsageEvent.tool_name.isnot(None)
        ).group_by(UsageEvent.tool_name).order_by(desc("count")).limit(5)
        
        top_tools = [
            {"tool_name": row.tool_name, "usage_count": row.count}
            for row in top_tools_query.all()
        ]
        
        # Recent errors
        recent_errors = self.get_error_logs(limit=5)
        
        return AnalyticsSummary(
            total_requests=total_requests,
            success_rate=round(success_rate, 2),
            average_response_time_ms=round(float(avg_response_time), 2),
            total_costs_usd=round(float(total_costs), 2),
            active_sessions=active_sessions,
            error_rate=round(error_rate, 2),
            top_tools=top_tools,
            recent_errors=recent_errors
        )
    
    def get_dashboard_metrics(self) -> DashboardMetrics:
        """Get real-time dashboard metrics"""
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Requests per minute
        requests_per_minute = self.db.query(func.count(UsageEvent.id)).filter(
            UsageEvent.timestamp >= one_minute_ago
        ).scalar() or 0
        
        # Average response time (last hour)
        one_hour_ago = now - timedelta(hours=1)
        avg_response_time = self.db.query(
            func.avg(UsageEvent.response_time_ms)
        ).filter(
            UsageEvent.timestamp >= one_hour_ago,
            UsageEvent.response_time_ms.isnot(None)
        ).scalar() or 0
        
        # Success rate (last hour)
        total_last_hour = self.db.query(func.count(UsageEvent.id)).filter(
            UsageEvent.timestamp >= one_hour_ago
        ).scalar() or 0
        
        successful_last_hour = self.db.query(func.count(UsageEvent.id)).filter(
            UsageEvent.timestamp >= one_hour_ago,
            UsageEvent.success == True
        ).scalar() or 0
        
        success_rate = (successful_last_hour / total_last_hour * 100) if total_last_hour > 0 else 0
        
        # Active sessions
        active_sessions = self.db.query(func.count(SessionModel.id)).filter(
            SessionModel.ended_at.is_(None)
        ).scalar() or 0
        
        # Total cost today
        total_cost_today = self.db.query(
            func.sum(CostTracking.cost_usd)
        ).filter(
            CostTracking.timestamp >= today
        ).scalar() or 0
        
        # Top errors (last hour)
        top_errors_query = self.db.query(
            ErrorLog.error_type,
            func.count(ErrorLog.id).label("count")
        ).filter(
            ErrorLog.timestamp >= one_hour_ago
        ).group_by(ErrorLog.error_type).order_by(desc("count")).limit(3)
        
        top_errors = [row.error_type for row in top_errors_query.all()]
        
        return DashboardMetrics(
            timestamp=now,
            requests_per_minute=requests_per_minute,
            average_response_time=round(float(avg_response_time), 2),
            success_rate=round(success_rate, 2),
            active_sessions=active_sessions,
            total_cost_today=round(float(total_cost_today), 2),
            top_errors=top_errors
        )
