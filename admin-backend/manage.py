#!/usr/bin/env python3
"""
Management CLI for MCP Admin Backend
"""
import asyncio
import click
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models.analytics import AdminUser
from app.core.security import get_password_hash


@click.group()
def cli():
    """MCP Admin Backend Management CLI"""
    pass


@cli.command()
def init_db():
    """Initialize the database"""
    click.echo("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    click.echo("Database initialized successfully!")


@cli.command()
@click.option('--username', prompt=True, help='Admin username')
@click.option('--email', prompt=True, help='Admin email')
@click.option('--password', prompt=True, hide_input=True, help='Admin password')
@click.option('--superuser', is_flag=True, help='Make user a superuser')
def create_admin(username: str, email: str, password: str, superuser: bool):
    """Create a new admin user"""
    db = SessionLocal()
    try:
        # Check if user exists
        existing_user = db.query(AdminUser).filter(
            (AdminUser.username == username) | (AdminUser.email == email)
        ).first()
        
        if existing_user:
            click.echo("Error: User with this username or email already exists!")
            return
        
        # Create new admin user
        hashed_password = get_password_hash(password)
        admin_user = AdminUser(
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=superuser
        )
        
        db.add(admin_user)
        db.commit()
        
        user_type = "superuser" if superuser else "admin user"
        click.echo(f"Successfully created {user_type}: {username}")
        
    except Exception as e:
        click.echo(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


@cli.command()
def list_admins():
    """List all admin users"""
    db = SessionLocal()
    try:
        users = db.query(AdminUser).all()
        
        if not users:
            click.echo("No admin users found.")
            return
        
        click.echo("\nAdmin Users:")
        click.echo("-" * 60)
        for user in users:
            status = "Active" if user.is_active else "Inactive"
            user_type = "Superuser" if user.is_superuser else "Admin"
            click.echo(f"ID: {user.id}")
            click.echo(f"Username: {user.username}")
            click.echo(f"Email: {user.email}")
            click.echo(f"Status: {status}")
            click.echo(f"Type: {user_type}")
            click.echo(f"Created: {user.created_at}")
            click.echo("-" * 60)
            
    except Exception as e:
        click.echo(f"Error listing admin users: {e}")
    finally:
        db.close()


@cli.command()
@click.option('--username', prompt=True, help='Username to delete')
@click.confirmation_option(prompt='Are you sure you want to delete this user?')
def delete_admin(username: str):
    """Delete an admin user"""
    db = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        
        if not user:
            click.echo(f"Error: User '{username}' not found!")
            return
        
        db.delete(user)
        db.commit()
        
        click.echo(f"Successfully deleted user: {username}")
        
    except Exception as e:
        click.echo(f"Error deleting admin user: {e}")
        db.rollback()
    finally:
        db.close()


@cli.command()
def serve():
    """Start the development server"""
    import uvicorn
    from app.core.config import settings
    
    click.echo(f"Starting server on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )


if __name__ == "__main__":
    cli()
