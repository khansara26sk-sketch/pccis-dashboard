
from sqlalchemy import select

from app.models import (
    AuditEvent,
    InspectionReview,
    ReviewStatus,
    UserRole,
)


def create_inspection(client, user, auth_headers):
    response = client.post(
        "/api/inspections",
        json={"product_name": "Basmati Rice"},
        headers=auth_headers(user),
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_submit_review_requires_authentication(client):
    response = client.post(
        "/api/inspections/1/reviews",
        json={"decision": "approved"},
    )
    assert response.status_code == 401


def test_inspector_cannot_submit_review(
    client, create_user, auth_headers
):
    inspector = create_user()
    inspection_id = create_inspection(client, inspector, auth_headers)

    response = client.post(
        f"/api/inspections/{inspection_id}/reviews",
        json={"decision": "approved"},
        headers=auth_headers(inspector),
    )

    assert response.status_code == 403


def test_senior_officer_can_submit_review(
    client, create_user, auth_headers, db
):
    inspector = create_user(email="inspector@example.com")
    reviewer = create_user(
        email="senior@example.com",
        role=UserRole.SENIOR_OFFICER,
    )
    inspection_id = create_inspection(client, inspector, auth_headers)

    response = client.post(
        f"/api/inspections/{inspection_id}/reviews",
        json={
            "decision": "approved",
            "comments": "  Documents verified  ",
        },
        headers=auth_headers(reviewer),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["inspection_id"] == inspection_id
    assert body["reviewer_id"] == reviewer.id
    assert body["decision"] == "approved"
    assert body["comments"] == "Documents verified"

    db.refresh(db.get(type(db.get(InspectionReview, body["id"])), body["id"])) if False else None
    assert db.scalar(
        select(InspectionReview).where(
            InspectionReview.id == body["id"]
        )
    ) is not None

    assert db.scalar(
        select(AuditEvent).where(
            AuditEvent.action == "inspection.review_submitted"
        )
    ) is not None


def test_review_updates_inspection_status(
    client, create_user, auth_headers, db
):
    inspector = create_user()
    reviewer = create_user(
        email="senior@example.com",
        role=UserRole.SENIOR_OFFICER,
    )
    inspection_id = create_inspection(client, inspector, auth_headers)

    response = client.post(
        f"/api/inspections/{inspection_id}/reviews",
        json={"decision": "needs_correction"},
        headers=auth_headers(reviewer),
    )

    assert response.status_code == 201

    from app.models import Inspection

    inspection = db.get(Inspection, inspection_id)
    assert inspection.review_status == ReviewStatus.REVIEWED


def test_inspector_can_view_own_review_history(
    client, create_user, auth_headers
):
    inspector = create_user()
    reviewer = create_user(
        email="senior@example.com",
        role=UserRole.SENIOR_OFFICER,
    )
    inspection_id = create_inspection(client, inspector, auth_headers)

    client.post(
        f"/api/inspections/{inspection_id}/reviews",
        json={"decision": "approved"},
        headers=auth_headers(reviewer),
    )

    response = client.get(
        f"/api/inspections/{inspection_id}/reviews",
        headers=auth_headers(inspector),
    )

    assert response.status_code == 200
    assert response.json()["review_status"] == "reviewed"
    assert len(response.json()["reviews"]) == 1


def test_inspector_cannot_view_another_users_reviews(
    client, create_user, auth_headers
):
    owner = create_user(email="owner@example.com")
    another_user = create_user(email="another@example.com")
    inspection_id = create_inspection(client, owner, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection_id}/reviews",
        headers=auth_headers(another_user),
    )

    assert response.status_code == 403


def test_report_requires_authentication(client):
    response = client.get("/api/inspections/1/report")
    assert response.status_code == 401


def test_inspection_owner_can_view_report(
    client, create_user, auth_headers
):
    inspector = create_user()
    inspection_id = create_inspection(client, inspector, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection_id}/report",
        headers=auth_headers(inspector),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["inspection"]["id"] == inspection_id
    assert body["inspection"]["product_name"] == "Basmati Rice"
    assert body["evidence"] == []
    assert body["extracted_fields"] == []
    assert body["compliance_results"] == []
    assert body["reviews"] == []
    assert "automated declaration-presence screening" in body["disclaimer"]


def test_other_inspector_cannot_view_report(
    client, create_user, auth_headers
):
    owner = create_user(email="owner@example.com")
    another_user = create_user(email="another@example.com")
    inspection_id = create_inspection(client, owner, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection_id}/report",
        headers=auth_headers(another_user),
    )

    assert response.status_code == 403


def test_senior_officer_can_view_report(
    client, create_user, auth_headers
):
    inspector = create_user(email="inspector@example.com")
    senior = create_user(
        email="senior@example.com",
        role=UserRole.SENIOR_OFFICER,
    )
    inspection_id = create_inspection(client, inspector, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection_id}/report",
        headers=auth_headers(senior),
    )

    assert response.status_code == 200
    assert response.json()["inspection"]["id"] == inspection_id
