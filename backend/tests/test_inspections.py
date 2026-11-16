import re

from sqlalchemy import select

from app.models import AuditEvent, Inspection


def test_create_inspection_requires_authentication(client):
    assert client.post("/api/inspections", json={}).status_code == 401


def test_create_inspection(client, create_user, auth_headers, db):
    user = create_user()
    response = client.post(
        "/api/inspections", json={"product_name": "  Basmati   Rice 1 kg "}, headers=auth_headers(user)
    )
    assert response.status_code == 201
    body = response.json()
    assert re.fullmatch(r"INS-\d{8}-[0-9A-F]{6}", body["inspection_number"])
    assert body["product_name"] == "Basmati Rice 1 kg"
    assert body["inspector_id"] == user.id
    assert body["status"] == "draft" and body["overall_result"] is None
    assert db.scalar(select(AuditEvent).where(AuditEvent.action == "inspection.created")) is not None


def test_blank_or_missing_product_name_becomes_null(client, create_user, auth_headers):
    headers = auth_headers(create_user())
    assert client.post("/api/inspections", json={"product_name": "   "}, headers=headers).json()["product_name"] is None
    assert client.post("/api/inspections", json={}, headers=headers).json()["product_name"] is None


def test_inspection_numbers_are_unique(client, create_user, auth_headers, db):
    headers = auth_headers(create_user())
    for _ in range(3):
        assert client.post("/api/inspections", json={}, headers=headers).status_code == 201
    numbers = [i.inspection_number for i in db.scalars(select(Inspection))]
    assert len(numbers) == len(set(numbers)) == 3

def test_list_inspections_requires_authentication(client):
    response = client.get("/api/inspections")
    assert response.status_code == 401


def test_list_inspections_only_returns_own_records(
    client, create_user, auth_headers
):
    user1 = create_user(email="user1@example.com")
    user2 = create_user(email="user2@example.com")

    client.post(
        "/api/inspections",
        json={"product_name": "Rice"},
        headers=auth_headers(user1),
    )
    client.post(
        "/api/inspections",
        json={"product_name": "Wheat"},
        headers=auth_headers(user2),
    )

    response = client.get(
        "/api/inspections",
        headers=auth_headers(user1),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["product_name"] == "Rice"


def test_list_inspections_search_and_status_filter(
    client, create_user, auth_headers
):
    user = create_user()
    headers = auth_headers(user)

    client.post(
        "/api/inspections",
        json={"product_name": "Basmati Rice"},
        headers=headers,
    )
    client.post(
        "/api/inspections",
        json={"product_name": "Wheat Flour"},
        headers=headers,
    )

    response = client.get(
        "/api/inspections?search=Rice&status=draft",
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["product_name"] == "Basmati Rice"


def test_list_inspections_pagination(client, create_user, auth_headers):
    user = create_user()
    headers = auth_headers(user)

    for name in ["Rice", "Wheat", "Sugar"]:
        client.post(
            "/api/inspections",
            json={"product_name": name},
            headers=headers,
        )

    first = client.get(
        "/api/inspections?skip=0&limit=1",
        headers=headers,
    )
    second = client.get(
        "/api/inspections?skip=1&limit=1",
        headers=headers,
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(first.json()) == 1
    assert len(second.json()) == 1
    assert first.json()[0]["id"] != second.json()[0]["id"]


def test_get_inspection_requires_authentication(client):
    response = client.get("/api/inspections/1")
    assert response.status_code == 401


def test_get_inspection_returns_owner_record(
    client, create_user, auth_headers
):
    user = create_user()

    created = client.post(
        "/api/inspections",
        json={"product_name": "Rice"},
        headers=auth_headers(user),
    )

    inspection_id = created.json()["id"]

    response = client.get(
        f"/api/inspections/{inspection_id}",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json()["id"] == inspection_id


def test_get_inspection_hides_another_users_record(
    client, create_user, auth_headers
):
    owner = create_user(email="owner@example.com")
    another_user = create_user(email="another@example.com")

    created = client.post(
        "/api/inspections",
        json={"product_name": "Rice"},
        headers=auth_headers(owner),
    )

    inspection_id = created.json()["id"]

    response = client.get(
        f"/api/inspections/{inspection_id}",
        headers=auth_headers(another_user),
    )

    assert response.status_code == 404