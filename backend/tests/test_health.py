from sqlalchemy.exc import OperationalError

from app.database import get_db
from app.main import create_app
from fastapi.testclient import TestClient


def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"


def test_health_reports_database_failure():
    class BrokenSession:
        def execute(self, *_args, **_kwargs):
            raise OperationalError("SELECT 1", {}, Exception("db down"))

    def broken_db():
        yield BrokenSession()

    application = create_app()
    application.dependency_overrides[get_db] = broken_db
    with TestClient(application) as c:
        response = c.get("/api/health")
    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"


def test_cors_allows_vite_dev_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
