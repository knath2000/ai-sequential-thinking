"""
Pydantic schemas for analytics and logging data
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class UsageEventBase(BaseModel):
    session_id: Optional[str] = None
    event_type: str
    tool_name: Optional[str] = None
    response_time_ms: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class UsageEventCreate(UsageEventBase):
    pass


class UsageEventResponse(UsageEventBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class PerformanceMetricBase(BaseModel):
    metric_name: str
    metric_value: float
    metric_unit: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None


class PerformanceMetricCreate(PerformanceMetricBase):
    pass


class PerformanceMetricResponse(PerformanceMetricBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ErrorLogBase(BaseModel):
    session_id: Optional[str] = None
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ErrorLogCreate(ErrorLogBase):
    pass


class ErrorLogResponse(ErrorLogBase):
    id: int
    timestamp: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SessionBase(BaseModel):
    session_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    ended_at: Optional[datetime] = None
    total_requests: Optional[int] = None
    total_errors: Optional[int] = None
    total_processing_time_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class SessionResponse(SessionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    total_requests: int
    total_errors: int
    total_processing_time_ms: int
    
    class Config:
        from_attributes = True


class CostTrackingBase(BaseModel):
    service_name: str
    operation_type: str
    tokens_used: Optional[int] = None
    cost_usd: float
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CostTrackingCreate(CostTrackingBase):
    pass


class CostTrackingResponse(CostTrackingBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    """Summary analytics response"""
    total_requests: int
    success_rate: float
    average_response_time_ms: float
    total_costs_usd: float
    active_sessions: int
    error_rate: float
    top_tools: List[Dict[str, Any]]
    recent_errors: List[ErrorLogResponse]


class DashboardMetrics(BaseModel):
    """Real-time dashboard metrics"""
    timestamp: datetime
    requests_per_minute: int
    average_response_time: float
    success_rate: float
    active_sessions: int
    total_cost_today: float
    top_errors: List[str]


class AdminUserBase(BaseModel):
    username: str
    email: str
    is_active: bool = True
    is_superuser: bool = False


class AdminUserCreate(AdminUserBase):
    password: str


class AdminUserResponse(AdminUserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
