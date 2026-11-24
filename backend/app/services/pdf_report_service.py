
"""Generate downloadable PDF inspection reports."""

from collections.abc import Mapping
from enum import Enum
from html import escape
from io import BytesIO
from typing import Any


class PDFReportError(Exception):
    """Base class for expected PDF report errors."""


class PDFDependencyUnavailable(PDFReportError):
    """Raised when the optional PDF rendering dependency is not installed."""


class InvalidPDFReport(PDFReportError):
    """Raised when report data is missing or has an invalid shape."""


class PDFGenerationFailed(PDFReportError):
    """Raised when ReportLab cannot render a valid report."""


def _get_value(value: object, name: str) -> Any:
    if isinstance(value, Mapping):
        return value.get(name)
    return getattr(value, name, None)


def _get_rows(report: Mapping[str, Any], name: str) -> list:
    rows = report.get(name)
    if rows is None:
        return []
    if not isinstance(rows, (list, tuple)):
        raise InvalidPDFReport(f"Report section {name!r} must be a list.")
    return list(rows)


def generate_inspection_pdf(report: Mapping[str, Any]) -> BytesIO:
    """Generate a PDF from inspection report data."""

    if not isinstance(report, Mapping) or not report:
        raise InvalidPDFReport("Inspection report data is required.")

    inspection = report.get("inspection")
    if inspection is None:
        raise InvalidPDFReport("Inspection details are required.")

    evidence = _get_rows(report, "evidence")
    extracted_fields = _get_rows(report, "extracted_fields")
    compliance_results = _get_rows(report, "compliance_results")
    reviews = _get_rows(report, "reviews")

    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
        from reportlab.platypus.doctemplate import LayoutError
    except ImportError as exc:
        raise PDFDependencyUnavailable(
            "PDF reporting requires ReportLab. Install the backend requirements."
        ) from exc

    def safe(value: object) -> str:
        if isinstance(value, Enum):
            value = value.value
        if value is None:
            value = "—"

        supported_text: list[str] = []
        for character in str(value):
            codepoint = ord(character)
            if (codepoint < 32 and character not in "\t\n\r") or codepoint == 127:
                supported_text.append(f"[U+{codepoint:04X}]")
                continue
            try:
                character.encode("cp1252")
            except UnicodeEncodeError:
                supported_text.append(f"[U+{codepoint:04X}]")
            else:
                supported_text.append(character)

        return escape("".join(supported_text))

    def cell(value: object, *, bold: bool = False):
        text = safe(value)
        if bold:
            text = f"<b>{text}</b>"
        return Paragraph(text, body_style)

    def make_table(rows, col_widths, *, repeat_rows: int = 0):
        table = Table(
            rows,
            colWidths=col_widths,
            repeatRows=repeat_rows,
            splitByRow=1,
            splitInRow=1,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F8")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C8D2E0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return table

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        pageCompression=0,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#243B64"),
        spaceAfter=16,
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#243B64"),
        spaceBefore=12,
        spaceAfter=7,
    )
    body_style = styles["BodyText"]
    two_columns = [55 * mm, 115 * mm]

    story = [
        Paragraph("PACKAGED COMMODITY INSPECTION REPORT", title_style),
        Paragraph("Inspection Details", section_style),
        make_table([
            [cell("Inspection Number", bold=True),
             cell(_get_value(inspection, "inspection_number"))],
            [cell("Product Name", bold=True),
             cell(_get_value(inspection, "product_name"))],
            [cell("Inspector", bold=True),
             cell(
                 _get_value(_get_value(inspection, "inspector"), "full_name")
                 or _get_value(_get_value(inspection, "inspector"), "name")
             )],
            [cell("Inspection Status", bold=True),
             cell(_get_value(inspection, "status"))],
            [cell("Overall Result", bold=True),
             cell(_get_value(inspection, "overall_result"))],
            [cell("Review Status", bold=True),
             cell(_get_value(inspection, "review_status"))],
            [cell("Inspection Date", bold=True),
             cell(_get_value(inspection, "inspection_date"))],
        ], two_columns),
        Paragraph("Evidence", section_style),
    ]

    evidence_rows = [[
        cell("File", bold=True),
        cell("Content Type", bold=True),
        cell("Size (bytes)", bold=True),
        cell("Uploaded", bold=True),
    ]]
    for item in evidence:
        evidence_rows.append([
            cell(_get_value(item, "original_filename")),
            cell(_get_value(item, "content_type")),
            cell(_get_value(item, "file_size_bytes")),
            cell(_get_value(item, "uploaded_at")),
        ])
    if not evidence:
        evidence_rows.append([cell("No evidence attached"), cell(""), cell(""), cell("")])
    story.append(make_table(
        evidence_rows,
        [66 * mm, 38 * mm, 27 * mm, 39 * mm],
        repeat_rows=1,
    ))

    story.append(Paragraph("Extracted Product Fields", section_style))
    field_rows = [[cell("Field", bold=True), cell("Extracted Value", bold=True)]]
    for field in extracted_fields:
        field_rows.append([
            cell(_get_value(field, "field_name")),
            cell(_get_value(field, "extracted_value")),
        ])
    if not extracted_fields:
        field_rows.append([cell("No extracted fields"), cell("")])
    story.append(make_table(field_rows, two_columns, repeat_rows=1))

    story.append(Paragraph("Compliance Screening Results", section_style))
    rule_rows = [[cell("Rule", bold=True), cell("Status", bold=True)]]
    for result in compliance_results:
        rule_rows.append([
            cell(_get_value(result, "rule_id")),
            cell(_get_value(result, "status")),
        ])
    if not compliance_results:
        rule_rows.append([cell("No results available"), cell("")])
    story.append(make_table(rule_rows, two_columns, repeat_rows=1))

    story.append(Paragraph("Officer Review History", section_style))
    review_rows = [[cell("Decision", bold=True), cell("Comments", bold=True)]]
    for review in reviews:
        review_rows.append([
            cell(_get_value(review, "decision")),
            cell(_get_value(review, "comments")),
        ])
    if not reviews:
        review_rows.append([cell("No reviews submitted"), cell("")])
    story.append(make_table(review_rows, two_columns, repeat_rows=1))

    story.extend([
        Spacer(1, 14),
        Paragraph("Disclaimer", section_style),
        Paragraph(safe(report.get("disclaimer")), body_style),
    ])

    try:
        document.build(story)
    except (LayoutError, OSError, TypeError, ValueError, UnicodeError) as exc:
        raise PDFGenerationFailed("ReportLab could not render the inspection report.") from exc

    buffer.seek(0)
    return buffer
