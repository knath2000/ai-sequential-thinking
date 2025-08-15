"""
Authentication dependencies for FastAPI routes
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ...core.security import verify_token
from ...db.database import get_db
from ...models.analytics import AdminUser
from ...schemas.analytics import AdminUserResponse

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AdminUserResponse:
    """Get the current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    username = verify_token(credentials.credentials)
    if username is None:
        raise credentials_exception
    
    # Get user from database
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return AdminUserResponse.from_orm(user)


async def get_current_active_user(
    current_user: AdminUserResponse = Depends(get_current_user)
) -> AdminUserResponse:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_current_superuser(
    current_user: AdminUserResponse = Depends(get_current_user)
) -> AdminUserResponse:
    """Get the current superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[AdminUserResponse]:
    """Optional authentication - returns user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        username = verify_token(credentials.credentials)
        if username is None:
            return None
        
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if user is None or not user.is_active:
            return None
        
        return AdminUserResponse.from_orm(user)
    except Exception:
        return None
