from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.models import UserRole
from app.routes import reports as reports_route
from app.services.pdf_report_service import (
    InvalidPDFReport,
    PDFDependencyUnavailable,
    PDFGenerationFailed,
    generate_inspection_pdf,
)


DISCLAIMER = (
    "Automated declaration-presence screening does not establish "
    "statutory compliance or a legal violation."
)


def make_report(**overrides):
    report = {
        "inspection": SimpleNamespace(
            inspection_number="INS-20261124-ABC123",
            product_name="Packaged tea",
            inspector=SimpleNamespace(full_name="Test Inspector"),
            status="analyzed",
            overall_result="Manual Review",
            review_status="reviewed",
            inspection_date=datetime(2026, 11, 24, tzinfo=timezone.utc),
        ),
        "evidence": [],
        "extracted_fields": [],
        "compliance_results": [],
        "reviews": [],
        "disclaimer": DISCLAIMER,
    }
    report.update(overrides)
    return report


def assert_pdf_bytes(content):
    assert content
    assert content.startswith(b"%PDF-")


def test_generate_pdf_with_optional_sections_and_disclaimer():
    report = make_report(
        evidence=[
            SimpleNamespace(
                original_filename="label-front.png",
                content_type="image/png",
                file_size_bytes=12345,
                uploaded_at="2026-11-24T12:00:00Z",
            )
        ],
        extracted_fields=[
            SimpleNamespace(field_name="net_quantity", extracted_value="200 g")
        ],
        compliance_results=[
            SimpleNamespace(rule_id="DECL-004", status="Manual Review")
        ],
        reviews=[
            SimpleNamespace(decision="approved", comments="Label was reviewed.")
        ],
    )

    content = generate_inspection_pdf(report).getvalue()

    assert_pdf_bytes(content)
    for expected in (
        b"label-front.png",
        b"net_quantity",
        b"200 g",
        b"DECL-004",
        b"Manual Review",
        b"Label was reviewed.",
        b"Automated declaration-presence screening",
        b"statutory compliance",
    ):
        assert expected in content


def test_generate_pdf_with_empty_optional_sections():
    content = generate_inspection_pdf(
        {"inspection": make_report()["inspection"]}
    ).getvalue()

    assert_pdf_bytes(content)
    assert b"No evidence attached" in content
    assert b"No extracted fields" in content
    assert b"No results available" in content
    assert b"No reviews submitted" in content


@pytest.mark.parametrize(
    "report",
    [None, {}, {"evidence": []}, {"inspection": None}],
)
def test_missing_or_empty_report_data_is_rejected(report):
    with pytest.raises(InvalidPDFReport):
        generate_inspection_pdf(report)


def test_special_characters_and_long_text_generate_pdf():
    long_text = "Long declaration with details. " * 300
    report = make_report(
        inspection=SimpleNamespace(
            inspection_number="INS-20261124-ABC123",
            product_name="Café & <tea> ₹ 😀",
            inspector=SimpleNamespace(full_name="Inspector"),
            status="draft",
            overall_result=None,
            review_status="not_reviewed",
            inspection_date=None,
        ),
        extracted_fields=[
            SimpleNamespace(field_name="declaration", extracted_value=long_text)
        ],
    )

    content = generate_inspection_pdf(report).getvalue()

    assert_pdf_bytes(content)
    assert b"Caf" in content
    assert b"[U+20B9]" in content
    assert b"[U+1F600]" in content
    assert b"Long declaration with details." in content


def test_reportlab_is_loaded_only_when_pdf_generation_is_requested(monkeypatch):
    import builtins

    original_import = builtins.__import__

    def import_without_reportlab(name, *args, **kwargs):
        if name == "reportlab" or name.startswith("reportlab."):
            raise ModuleNotFoundError("No module named 'reportlab'", name="reportlab")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", import_without_reportlab)

    with pytest.raises(PDFDependencyUnavailable):
        generate_inspection_pdf(make_report())


def create_inspection(client, user, auth_headers):
    response = client.post(
        "/api/inspections",
        json={"product_name": "Packaged tea"},
        headers=auth_headers(user),
    )
    assert response.status_code == 201
    return response.json()


def test_inspection_owner_can_download_pdf(client, create_user, auth_headers):
    owner = create_user()
    inspection = create_inspection(client, owner, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection['id']}/report/pdf",
        headers=auth_headers(owner),
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="{inspection["inspection_number"]}.pdf"'
    )
    assert_pdf_bytes(response.content)


def test_other_inspector_cannot_download_pdf(
    client, create_user, auth_headers
):
    owner = create_user(email="owner@example.com")
    another_inspector = create_user(email="another@example.com")
    inspection = create_inspection(client, owner, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection['id']}/report/pdf",
        headers=auth_headers(another_inspector),
    )

    assert response.status_code == 403


def test_missing_inspection_returns_404(client, create_user, auth_headers):
    user = create_user()

    response = client.get(
        "/api/inspections/999999/report/pdf",
        headers=auth_headers(user),
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "role",
    [UserRole.SENIOR_OFFICER, UserRole.ADMIN],
)
def test_senior_officer_and_admin_can_download_pdf(
    client, create_user, auth_headers, role
):
    owner = create_user(email="owner@example.com")
    authorized_user = create_user(email=f"{role.value.lower().replace(' ', '-')}@example.com", role=role)
    inspection = create_inspection(client, owner, auth_headers)

    response = client.get(
        f"/api/inspections/{inspection['id']}/report/pdf",
        headers=auth_headers(authorized_user),
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert_pdf_bytes(response.content)


@pytest.mark.parametrize(
    ("failure", "expected_status"),
    [
        (PDFDependencyUnavailable, 503),
        (PDFGenerationFailed, 500),
    ],
)
def test_pdf_generation_failures_return_clear_server_errors(
    client,
    create_user,
    auth_headers,
    monkeypatch,
    failure,
    expected_status,
):
    owner = create_user()
    inspection = create_inspection(client, owner, auth_headers)

    def fail_generation(_report):
        raise failure("internal rendering details")

    monkeypatch.setattr(reports_route, "generate_inspection_pdf", fail_generation)

    response = client.get(
        f"/api/inspections/{inspection['id']}/report/pdf",
        headers=auth_headers(owner),
    )

    assert response.status_code == expected_status
    assert "PDF" in response.json()["detail"]
    assert "internal rendering details" not in response.json()["detail"]
