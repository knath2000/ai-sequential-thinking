"""
Analytics and logging models for MCP server data
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, JSON
from sqlalchemy.sql import func
from ..db.base import Base  # Import from base.py instead of database.py


class UsageEvent(Base):
    """Track individual tool usage events"""
    __tablename__ = "usage_events"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    session_id = Column(String(255), index=True)
    event_type = Column(String(100), nullable=False)  # tool_call, webhook, error, etc.
    tool_name = Column(String(100))  # sequential_thinking, perplexity_ask, etc.
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    user_agent = Column(String(500))
    ip_address = Column(String(50))
    meta = Column(JSON)  # Additional event-specific data
    
    def __repr__(self):
        return f"<UsageEvent(id={self.id}, type={self.event_type}, tool={self.tool_name})>"


class PerformanceMetric(Base):
    """Track performance metrics over time"""
    __tablename__ = "performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    metric_name = Column(String(100), nullable=False)  # response_time, success_rate, etc.
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50))  # ms, percent, count, etc.
    tags = Column(JSON)  # Additional metric tags
    # Optional session_id for easier lookups (nullable for backward compatibility)
    session_id = Column(String(255), index=True, nullable=True)
    
    def __repr__(self):
        return f"<PerformanceMetric(name={self.metric_name}, value={self.metric_value})>"


class ErrorLog(Base):
    """Track errors and exceptions"""
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    session_id = Column(String(255), index=True)
    error_type = Column(String(100), nullable=False)
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text)
    request_path = Column(String(500))
    request_method = Column(String(10))
    user_agent = Column(String(500))
    ip_address = Column(String(50))
    context = Column(JSON)  # Additional error context
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, type={self.error_type})>"


class Session(Base):
    """Track user sessions and activities"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    ended_at = Column(DateTime(timezone=True))
    user_agent = Column(String(500))
    ip_address = Column(String(50))
    total_requests = Column(Integer, default=0)
    total_errors = Column(Integer, default=0)
    total_processing_time_ms = Column(Integer, default=0)
    meta = Column(JSON)
    
    def __repr__(self):
        return f"<Session(id={self.session_id})>"


class CostTracking(Base):
    """Track costs for external services"""
    __tablename__ = "cost_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    service_name = Column(String(100), nullable=False)  # langdb, modal, etc.
    operation_type = Column(String(100), nullable=False)  # chat_completion, webhook, etc.
    tokens_used = Column(Integer)
    cost_usd = Column(Float, nullable=False)
    session_id = Column(String(255), index=True)
    request_id = Column(String(255))
    meta = Column(JSON)
    
    def __repr__(self):
        return f"<CostTracking(service={self.service_name}, cost=${self.cost_usd})>"


class AdminUser(Base):
    """Admin users for the dashboard"""
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<AdminUser(username={self.username})>"
