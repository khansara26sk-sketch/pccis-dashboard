from app.models import UserRole


def test_users_list_requires_authentication(client):
    assert client.get("/api/users").status_code == 401


def test_inspector_cannot_list_users(client, create_user, auth_headers):
    inspector = create_user(email="insp@example.com")
    assert client.get("/api/users", headers=auth_headers(inspector)).status_code == 403


def test_senior_officer_cannot_list_users(client, create_user, auth_headers):
    officer = create_user(email="officer@example.com", role=UserRole.SENIOR_OFFICER)
    assert client.get("/api/users", headers=auth_headers(officer)).status_code == 403


def test_admin_can_list_users_with_pagination(client, create_user, auth_headers):
    admin = create_user(email="admin@example.com", role=UserRole.ADMIN)
    for i in range(3):
        create_user(email=f"u{i}@example.com")
    response = client.get("/api/users?page=1&page_size=2", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4 and len(body["items"]) == 2
    assert all("hashed_password" not in item for item in body["items"])
    assert client.get("/api/users?page=0", headers=auth_headers(admin)).status_code == 422


def test_inspector_cannot_change_roles(client, create_user, auth_headers):
    inspector = create_user(email="insp@example.com")
    other = create_user(email="other@example.com")
    response = client.patch(
        f"/api/users/{other.id}/role", json={"role": "Admin"}, headers=auth_headers(inspector)
    )
    assert response.status_code == 403


def test_admin_can_change_role_and_it_takes_effect_immediately(client, create_user, auth_headers):
    admin = create_user(email="admin@example.com", role=UserRole.ADMIN)
    target = create_user(email="target@example.com")
    target_headers = auth_headers(target)
    assert client.get("/api/users", headers=target_headers).status_code == 403

    response = client.patch(
        f"/api/users/{target.id}/role", json={"role": "Admin"}, headers=auth_headers(admin)
    )
    assert response.status_code == 200 and response.json()["role"] == "Admin"
    # Same token, new role: roles are read from the database, not baked into the token.
    assert client.get("/api/users", headers=target_headers).status_code == 200


def test_admin_cannot_change_own_role(client, create_user, auth_headers):
    admin = create_user(email="admin@example.com", role=UserRole.ADMIN)
    response = client.patch(
        f"/api/users/{admin.id}/role", json={"role": "Inspector"}, headers=auth_headers(admin)
    )
    assert response.status_code == 400


def test_role_change_validation_and_not_found(client, create_user, auth_headers):
    admin = create_user(email="admin@example.com", role=UserRole.ADMIN)
    target = create_user(email="target@example.com")
    headers = auth_headers(admin)
    assert client.patch(f"/api/users/{target.id}/role", json={"role": "Root"}, headers=headers).status_code == 422
    assert client.patch("/api/users/9999/role", json={"role": "Inspector"}, headers=headers).status_code == 404
