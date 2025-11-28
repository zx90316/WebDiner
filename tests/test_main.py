import sys
import os
from pathlib import Path

# Add project root to sys.path to allow 'backend' imports
# This handles cases where the script is run from 'backend/' or 'VSCC RAG/'
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent
sys.path.append(str(project_root))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app import models
import pytest
from datetime import date, timedelta

# Setup Test DB
from sqlalchemy.pool import StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print(f"DEBUG: User columns: {models.User.__table__.columns.keys()}")
Base.metadata.create_all(bind=engine)

with engine.connect() as connection:
    from sqlalchemy import text
    result = connection.execute(text("PRAGMA table_info(users)"))
    columns = [row[1] for row in result]
    print(f"DEBUG: DB Users Table Columns: {columns}")

def override_get_db():
    try:
        db = TestingSessionLocal()
        print(f"DEBUG: App DB URL: {db.get_bind().url}")
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_register_user(test_db):
    response = client.post(
        "/auth/register",
        json={"employee_id": "testuser", "name": "Test User", "email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == "testuser"

@pytest.fixture(scope="module")
def auth_token(test_db):
    # Register admin directly in DB to ensure is_admin is True
    from app.routers.auth import get_password_hash
    
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.employee_id == "admin").first()
    
    if not user:
        hashed_password = get_password_hash("password123")
        new_user = models.User(
            employee_id="admin",
            name="Admin User",
            email="admin@example.com",
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user = new_user
    else:
        # Ensure is_admin is True
        user.is_admin = True
        user.is_active = True
        db.commit()
        db.refresh(user)
    
    print(f"DEBUG: Fixture User {user.employee_id} id={user.id} is_admin={user.is_admin}")
    db.close()
    
    # Login to get token
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "password123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]



def test_login_flow(test_db):
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_create_menu_item(test_db, auth_token):
    response = client.post(
        "/menu/",
        json={"name": "Burger", "description": "Tasty burger", "price": 100, "category": "Main"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Burger"

def test_order_future(test_db, auth_token):
    future_date = (date.today() + timedelta(days=1)).isoformat()
    # Need item ID
    response = client.get("/menu/", headers={"Authorization": f"Bearer {auth_token}"})
    items = response.json()
    assert len(items) > 0
    item_id = items[0]["id"]
    
    response = client.post(
        "/orders/",
        json={
            "order_date": future_date,
            "items": [{"menu_item_id": item_id, "quantity": 2}]
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Pending"

def test_admin_stats(test_db, auth_token):
    response = client.get("/admin/stats/today", headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    data = response.json()
    assert "total_price" in data
