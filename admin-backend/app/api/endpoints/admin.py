"""
Admin management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...db.database import get_db
from ...api.deps.auth import get_current_superuser, get_current_active_user
from ...core.security import get_password_hash
from ...models.analytics import AdminUser
from ...schemas.analytics import (
    AdminUserCreate, AdminUserResponse, AdminUserBase
)

router = APIRouter()


@router.post("/users", response_model=AdminUserResponse)
async def create_admin_user(
    user: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_superuser)
):
    """Create a new admin user (superuser only)"""
    # Check if user already exists
    existing_user = db.query(AdminUser).filter(
        (AdminUser.username == user.username) | (AdminUser.email == user.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = AdminUser(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_active=user.is_active,
        is_superuser=user.is_superuser
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return AdminUserResponse.from_orm(db_user)


@router.get("/users", response_model=List[AdminUserResponse])
async def list_admin_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """List all admin users"""
    users = db.query(AdminUser).offset(skip).limit(limit).all()
    return [AdminUserResponse.from_orm(user) for user in users]


@router.get("/users/me", response_model=AdminUserResponse)
async def read_current_user(
    current_user: AdminUserResponse = Depends(get_current_active_user)
):
    """Get current user info"""
    return current_user


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    user_id: int,
    user_update: AdminUserBase,
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_superuser)
):
    """Update an admin user (superuser only)"""
    db_user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    
    return AdminUserResponse.from_orm(db_user)


@router.delete("/users/{user_id}")
async def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUserResponse = Depends(get_current_superuser)
):
    """Delete an admin user (superuser only)"""
    db_user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    if db_user.username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(db_user)
    db.commit()
    
    return {"message": "User deleted successfully"}
