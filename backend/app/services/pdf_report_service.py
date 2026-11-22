
"""Generate downloadable PDF inspection reports."""

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def generate_inspection_pdf(report: dict) -> BytesIO:
    """Generate a PDF from inspection report data."""

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
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

    def safe(value):
        return escape(str(value if value is not None else "—"))

    def make_table(rows):
        table = Table(rows, colWidths=[55 * mm, 115 * mm])
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

    story = []

    inspection = report["inspection"]

    story.append(Paragraph("PACKAGED COMMODITY INSPECTION REPORT", title_style))
    story.append(Paragraph("Inspection Details", section_style))

    story.append(make_table([
        [Paragraph("<b>Inspection Number</b>", body_style),
         safe(getattr(inspection, "inspection_number", None))],
        [Paragraph("<b>Product Name</b>", body_style),
         safe(getattr(inspection, "product_name", None))],
        [Paragraph("<b>Inspector</b>", body_style),
         safe(getattr(getattr(inspection, "inspector", None), "full_name", None)
              or getattr(getattr(inspection, "inspector", None), "name", None))],
        [Paragraph("<b>Inspection Status</b>", body_style),
         safe(getattr(inspection, "status", None))],
        [Paragraph("<b>Overall Result</b>", body_style),
         safe(getattr(inspection, "overall_result", None))],
        [Paragraph("<b>Review Status</b>", body_style),
         safe(getattr(inspection, "review_status", None))],
        [Paragraph("<b>Inspection Date</b>", body_style),
         safe(getattr(inspection, "inspection_date", None))],
    ]))

    story.append(Paragraph("Extracted Product Fields", section_style))

    field_rows = [[
        Paragraph("<b>Field</b>", body_style),
        Paragraph("<b>Extracted Value</b>", body_style),
    ]]

    for field in report.get("extracted_fields", []):
        field_rows.append([
            safe(getattr(field, "field_name", None)),
            safe(getattr(field, "extracted_value", None)),
        ])

    if len(field_rows) == 1:
        field_rows.append(["No extracted fields", "—"])

    story.append(make_table(field_rows))

    story.append(Paragraph("Compliance Screening Results", section_style))

    rule_rows = [[
        Paragraph("<b>Rule</b>", body_style),
        Paragraph("<b>Status</b>", body_style),
    ]]

    for result in report.get("compliance_results", []):
        rule_rows.append([
            safe(getattr(result, "rule_id", None)),
            safe(getattr(result, "status", None)),
        ])

    if len(rule_rows) == 1:
        rule_rows.append(["No results available", "—"])

    story.append(make_table(rule_rows))

    story.append(Paragraph("Officer Review History", section_style))

    review_rows = [[
        Paragraph("<b>Decision</b>", body_style),
        Paragraph("<b>Comments</b>", body_style),
    ]]

    for review in report.get("reviews", []):
        review_rows.append([
            safe(getattr(review, "decision", None)),
            safe(getattr(review, "comments", None)),
        ])

    if len(review_rows) == 1:
        review_rows.append(["No reviews submitted", "—"])

    story.append(make_table(review_rows))

    story.append(Spacer(1, 14))
    story.append(Paragraph("Disclaimer", section_style))
    story.append(Paragraph(safe(report.get("disclaimer")), body_style))

    document.build(story)

    buffer.seek(0)
    return buffer
