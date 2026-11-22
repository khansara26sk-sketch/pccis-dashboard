from app.models import UserRole
from app.services import evidence_service
from app.services.ocr_service import OCRResult
from tests.helpers import make_image


def test_complete_inspection_workflow(
    client,
    create_user,
    auth_headers,
    storage_settings,
    monkeypatch,
):
    # 1. Create inspector and senior officer
    inspector = create_user(email="workflow-inspector@example.com")
    reviewer = create_user(
        email="workflow-senior@example.com",
        role=UserRole.SENIOR_OFFICER,
    )

    inspector_headers = auth_headers(inspector)
    reviewer_headers = auth_headers(reviewer)

    # 2. Create inspection
    inspection_response = client.post(
        "/api/inspections",
        json={"product_name": "Basmati Rice"},
        headers=inspector_headers,
    )

    assert inspection_response.status_code == 201
    inspection_id = inspection_response.json()["id"]

    # 3. Mock OCR processing
    ocr_text = (
        "Product Name: Basmati Rice\n"
        "Batch No: B123\n"
        "Mfg Date: 01/2025\n"
        "Expiry Date: 01/2027"
    )

    monkeypatch.setattr(
        evidence_service,
        "extract_text",
        lambda *args, **kwargs: OCRResult(
            text=ocr_text,
            confidence=96.0,
        ),
    )

    # 4. Upload evidence and trigger OCR
    upload_response = client.post(
        f"/api/inspections/{inspection_id}/evidence",
        files={
            "file": (
                "workflow-test.png",
                make_image("PNG", (320, 200)),
                "image/png",
            )
        },
        headers=inspector_headers,
    )

    assert upload_response.status_code == 201
    evidence_id = upload_response.json()["id"]

    # 5. Verify OCR result
    ocr_response = client.get(
        f"/api/inspections/{inspection_id}/evidence/{evidence_id}/ocr",
        headers=inspector_headers,
    )

    assert ocr_response.status_code == 200

    # 6. Run compliance screening
    compliance_response = client.post(
        f"/api/inspections/{inspection_id}/compliance/run",
        headers=inspector_headers,
    )

    assert compliance_response.status_code == 200
    compliance_body = compliance_response.json()

    assert compliance_body["inspection_id"] == inspection_id
    assert len(compliance_body["rules"]) == 8

    # 7. Verify saved compliance results
    saved_compliance_response = client.get(
        f"/api/inspections/{inspection_id}/compliance",
        headers=inspector_headers,
    )

    assert saved_compliance_response.status_code == 200
    assert len(saved_compliance_response.json()["rules"]) == 8

    # 8. Submit review as Senior Officer
    review_response = client.post(
        f"/api/inspections/{inspection_id}/reviews",
        json={
            "decision": "approved",
            "comments": "Workflow integration test review",
        },
        headers=reviewer_headers,
    )

    assert review_response.status_code == 201
    assert review_response.json()["inspection_id"] == inspection_id

    # 9. Verify review history
    reviews_response = client.get(
        f"/api/inspections/{inspection_id}/reviews",
        headers=inspector_headers,
    )

    assert reviews_response.status_code == 200
    assert len(reviews_response.json()["reviews"]) == 1

    # 10. Verify final inspection report
    report_response = client.get(
        f"/api/inspections/{inspection_id}/report",
        headers=inspector_headers,
    )

    assert report_response.status_code == 200
    report = report_response.json()

    assert report["inspection"]["id"] == inspection_id
    assert len(report["evidence"]) == 1
    assert report["extracted_fields"]
    assert len(report["compliance_results"]) == 8
    assert len(report["reviews"]) == 1
