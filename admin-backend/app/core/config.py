"""
Configuration settings for the FastAPI Admin Backend
"""
import os
from typing import Any, Dict, Optional
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MCP Admin Backend"
    PROJECT_VERSION: str = "1.0.0"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Database Settings
    DATABASE_URL: Optional[str] = None
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "mcp_admin"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = ""
    
    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql://{values.get('DATABASE_USER')}:{values.get('DATABASE_PASSWORD')}@{values.get('DATABASE_HOST')}:{values.get('DATABASE_PORT')}/{values.get('DATABASE_NAME')}"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Security Settings
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # MCP Server Integration
    MCP_SERVER_URL: str = ""
    MCP_SERVER_API_KEY: str = ""
    MCP_WEBHOOK_SECRET: str = ""
    
    # External Services
    LANGDB_API_KEY: str = ""
    LANGDB_PROJECT_ID: str = ""
    MODAL_API_TOKEN: str = ""
    
    # Railway Integration
    RAILWAY_PROJECT_ID: str = ""
    RAILWAY_SERVICE_ID: str = ""
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Analytics
    ANALYTICS_RETENTION_DAYS: int = 90
    METRICS_UPDATE_INTERVAL: int = 60
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
