import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "TaskFlow AI API is running"

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_register_user():
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "full_name": "Test User"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"

def test_register_duplicate_email():
    client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "dupuser",
        "password": "pass123"
    })
    response = client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "dupuser2",
        "password": "pass123"
    })
    assert response.status_code == 400

def get_auth_token():
    client.post("/api/auth/register", json={
        "email": "auth_test@example.com",
        "username": "auth_user",
        "password": "password123"
    })
    response = client.post("/api/auth/login", data={
        "username": "auth_test@example.com",
        "password": "password123"
    })
    return response.json()["access_token"]

def test_login():
    client.post("/api/auth/register", json={
        "email": "login@example.com",
        "username": "loginuser",
        "password": "loginpass"
    })
    response = client.post("/api/auth/login", data={
        "username": "login@example.com",
        "password": "loginpass"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid():
    response = client.post("/api/auth/login", data={
        "username": "nobody@example.com",
        "password": "wrongpass"
    })
    assert response.status_code == 401

def test_create_project():
    token = get_auth_token()
    response = client.post("/api/projects/", 
        json={"name": "My Project", "description": "Test", "color": "#FF5733"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "My Project"

def test_get_projects():
    token = get_auth_token()
    response = client.get("/api/projects/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_task():
    token = get_auth_token()
    project = client.post("/api/projects/",
        json={"name": "Task Project"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()
    response = client.post("/api/tasks/",
        json={"title": "Test Task", "project_id": project["id"], "priority": "high"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Test Task"

def test_update_task_status():
    token = get_auth_token()
    project = client.post("/api/projects/",
        json={"name": "Status Project"},
        headers={"Authorization": f"Bearer {token}"}
    ).json()
    task = client.post("/api/tasks/",
        json={"title": "Status Task", "project_id": project["id"]},
        headers={"Authorization": f"Bearer {token}"}
    ).json()
    response = client.put(f"/api/tasks/{task['id']}",
        json={"status": "done"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "done"

def test_get_stats():
    token = get_auth_token()
    response = client.get("/api/tasks/stats", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "done" in data
