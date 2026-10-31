from fastapi.testclient import TestClient
from main import app
from pydantic import BaseModel

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200

def test_get_history():
    response = client.get("/api/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_history():
    payload = {
        "city_name": "Can Tho",
        "temperature": 31.0,
        "condition": "Sunny"
    }
    response = client.post("/api/history", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["city_name"] == "Can Tho"
    assert "id" in data