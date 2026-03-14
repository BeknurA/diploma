# tests/test_main.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    # Проверяем, что главная страница отвечает 200 OK
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "System Online", "version": "1.0.0"}

def test_swagger_ui_exists():
    # Проверяем, что документация доступна
    response = client.get("/docs")
    assert response.status_code == 200