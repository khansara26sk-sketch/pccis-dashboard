
from sqlalchemy import func, select

from app.models import ExtractedField, RuleResult


def _create_inspection(client, user, auth_headers):
    response = client.post(
        "/api/inspections",
        json={"product_name": "Basmati Rice"},
        headers=auth_headers(user),
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_list_rules_requires_authentication(client):
    response = client.get("/api/rules")
    assert response.status_code == 401


def test_list_rules_returns_eight_screening_checks(
    client, create_user, auth_headers
):
    user = create_user()
    response = client.get(
        "/api/rules",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    rules = response.json()

    assert len(rules) == 8
    assert rules[0]["rule_id"] == "DECL-001"
    assert all(
        rule["rule_type"] == "Declaration presence screening"
        for rule in rules
    )
    assert all(
        "Not legally verified" in rule["legal_verification"]
        for rule in rules
    )


def test_run_compliance_requires_authentication(client):
    response = client.post("/api/inspections/1/compliance/run")
    assert response.status_code == 401


def test_run_compliance_returns_potential_issue_and_saves_results(
    client, create_user, auth_headers, db
):
    user = create_user()
    inspection_id = _create_inspection(client, user, auth_headers)

    db.add(
        ExtractedField(
            inspection_id=inspection_id,
            field_name="product_name",
            extracted_value="Basmati Rice",
            manually_corrected=True,
        )
    )
    db.commit()

    response = client.post(
        f"/api/inspections/{inspection_id}/compliance/run",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    body = response.json()

    assert body["inspection_id"] == inspection_id
    assert body["overall_result"] == "Potential Issue"
    assert len(body["rules"]) == 8
    assert body["rules"][0]["status"] == "Manual Review"
    assert body["potential_issues"]
    assert "do not establish statutory compliance" in body["disclaimer"]

    saved_count = db.scalar(
        select(func.count()).select_from(RuleResult).where(
            RuleResult.inspection_id == inspection_id
        )
    )
    assert saved_count == 8


def test_run_compliance_without_extracted_data_returns_manual_review(
    client, create_user, auth_headers
):
    user = create_user()
    inspection_id = _create_inspection(client, user, auth_headers)

    response = client.post(
        f"/api/inspections/{inspection_id}/compliance/run",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    body = response.json()

    assert body["overall_result"] == "Manual Review"
    assert len(body["rules"]) == 8
    assert all(
        rule["status"] == "Manual Review"
        for rule in body["rules"]
    )


def test_get_compliance_results_after_run(
    client, create_user, auth_headers
):
    user = create_user()
    inspection_id = _create_inspection(client, user, auth_headers)
    headers = auth_headers(user)

    run_response = client.post(
        f"/api/inspections/{inspection_id}/compliance/run",
        headers=headers,
    )
    assert run_response.status_code == 200

    response = client.get(
        f"/api/inspections/{inspection_id}/compliance",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["inspection_id"] == inspection_id
    assert len(response.json()["rules"]) == 8


def test_get_compliance_results_before_run_returns_404(
    client, create_user, auth_headers
):
    user = create_user()
    inspection_id = _create_inspection(client, user, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection_id}/compliance",
        headers=auth_headers(user),
    )

    assert response.status_code == 404


def test_repeated_compliance_run_does_not_duplicate_results(
    client, create_user, auth_headers, db
):
    user = create_user()
    inspection_id = _create_inspection(client, user, auth_headers)
    headers = auth_headers(user)

    for _ in range(2):
        response = client.post(
            f"/api/inspections/{inspection_id}/compliance/run",
            headers=headers,
        )
        assert response.status_code == 200

    count = db.scalar(
        select(func.count()).select_from(RuleResult).where(
            RuleResult.inspection_id == inspection_id
        )
    )

    assert count == 8


def test_compliance_hides_another_users_inspection(
    client, create_user, auth_headers
):
    owner = create_user(email="compliance-owner@example.com")
    another_user = create_user(email="compliance-other@example.com")

    inspection_id = _create_inspection(client, owner, auth_headers)

    response = client.post(
        f"/api/inspections/{inspection_id}/compliance/run",
        headers=auth_headers(another_user),
    )

    assert response.status_code == 404
