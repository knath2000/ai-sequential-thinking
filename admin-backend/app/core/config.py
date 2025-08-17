"""
Configuration settings for the FastAPI Admin Backend (Pydantic v2)
"""
from typing import Any, Dict, Optional
from pydantic import FieldValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: FieldValidationInfo) -> Any:
        # If full URL is provided, use it
        if isinstance(v, str) and v:
            return v
        # Otherwise build from individual parts
        data: Dict[str, Any] = dict(info.data or {})
        user = data.get("DATABASE_USER", "postgres")
        password = data.get("DATABASE_PASSWORD", "")
        host = data.get("DATABASE_HOST", "localhost")
        port = data.get("DATABASE_PORT", 5432)
        name = data.get("DATABASE_NAME", "mcp_admin")
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Security Settings
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ANALYTICS_INGEST_KEY: str = ""
    
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
    # Development helpers
    ALLOW_DEV_AUTH_BYPASS: bool = False
    ANALYTICS_PUBLIC_READ: bool = True
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://gallant-reflection-production.up.railway.app"
    ]
    
    # Pydantic v2 settings config
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


# Global settings instance
settings = Settings()
