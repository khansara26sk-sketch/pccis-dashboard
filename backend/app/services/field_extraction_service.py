"""Extract important product fields from OCR text."""

from dataclasses import dataclass
from datetime import datetime
from collections import Counter
import re
from app.services.ocr_service import OCRCandidate

@dataclass(frozen=True)
class ExtractedProductFields:
    product_name: str | None
    batch_number: str | None
    manufacturing_date: str | None
    expiry_date: str | None
    manufacturer: str | None = None
    address: str | None = None
    net_quantity: str | None = None
    mrp: str | None = None
    consumer_care: str | None = None
    country_of_origin: str | None = None


DATE_PATTERN = re.compile(
    r"\b(?:"
    r"\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}"
    r"|\d{4}-\d{1,2}-\d{1,2}"
    r"|\d{1,2}[/.-]\d{4}"
    r")\b"
)

QUANTITY_PATTERN = re.compile(
    r"\d+(?:\.\d+)?\s*(?:mg|kg|g|ml|l|litre|liter)\b",
    re.IGNORECASE,
)

MRP_PATTERN = re.compile(
    r"^(?:(?:₹|rs\.?|inr)\s*)?\d+(?:[.,]\d{1,2})?$",
    re.IGNORECASE,
)

BATCH_PATTERN = re.compile(r"^[A-Za-z0-9/-]{2,30}$")

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
    "%m/%Y", "%m-%Y", "%m/%y", "%m-%y",
    "%Y-%m-%d",
]


def get_field_status(field_name: str, value: str | None) -> str:
    """Determine whether an extracted field needs manual review."""

    if not value or not value.strip():
        return "not_detected"

    value = value.strip()

    if field_name in {"manufacturing_date", "expiry_date"}:
        for date_format in DATE_FORMATS:
            try:
                datetime.strptime(value, date_format)
                return "extracted"
            except ValueError:
                continue

        return "needs_review"

    if field_name == "net_quantity":
        return (
            "extracted"
            if QUANTITY_PATTERN.fullmatch(value)
            else "needs_review"
        )

    if field_name == "mrp":
        return (
            "extracted"
            if MRP_PATTERN.fullmatch(value)
            else "needs_review"
        )

    if field_name == "batch_number":
        invalid_values = {"rs", "re", "mrp", "usp", "and", "or"}

        if value.lower().rstrip(".") in invalid_values:
            return "needs_review"

        return (
            "extracted"
            if BATCH_PATTERN.fullmatch(value) and any(c.isdigit() for c in value)
            else "needs_review"
        )

    return "extracted"


ALL_LABELS = [
    r"product\s*name", r"item\s*name",
    r"batch\s*(?:no|number)", r"lot\s*(?:no|number)",
    r"manufacturing\s*date", r"date\s*of\s*manufacture",
    r"manufactured", r"mfg[\s.,]*date", r"mfg",
    r"expiry\s*date", r"expiration\s*date",
    r"date\s*of\s*expiry", r"best\s*before",
    r"use\s*(?:before|by)",
    r"manufacturer", r"manufactured\s*by",
    r"manufactured\s*&\s*marketed\s*by",
    r"marketed\s*by", r"packed\s*by", r"imported\s*by",
    r"registered\s*address", r"manufacturing\s*address",
    r"factory\s*address", r"address",
    r"net\s*(?:quantity|weight|content|qty)",
    r"maximum\s*retail\s*price", r"mrp", r"retail\s*price",
    r"consumer\s*care", r"customer\s*care",
    r"consumer\s*complaint", r"customer\s*service",
    r"helpline",
    r"email", r"website", r"phone", r"telephone",
    r"contact\s*us", r"call\s*at",
    r"country\s*of\s*origin", r"made\s*in",
]


def _extract_label_value(text: str, labels: list[str]) -> str | None:
    """Extract a label's value without consuming the next labelled field."""

    current_pattern = "|".join(sorted(labels, key=len, reverse=True))
    boundary_pattern = "|".join(sorted(ALL_LABELS, key=len, reverse=True))

    pattern = (
        rf"(?i)(?:{current_pattern})\b\s*[:.,\-]?\s*"
        rf"(.*?)"
        rf"(?=\s+(?:{boundary_pattern})\b\s*[:.,\-]?|$)"
    )

    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)

    if not match:
        return None

    value = match.group(1).strip(" \t\r\n:.,-")

    return value or None


def _extract_date(text: str, labels: list[str]) -> str | None:
    raw_value = _extract_label_value(text, labels)

    if not raw_value:
        return None

    match = DATE_PATTERN.search(raw_value[:50])

    if not match:
        return None

    candidate = match.group(0)

    return (
        candidate
        if get_field_status("manufacturing_date", candidate) == "extracted"
        else None
    )


def _extract_quantity(text: str) -> str | None:
    raw_value = _extract_label_value(
        text,
        [
            r"net\s*quantity",
            r"net\s*weight",
            r"net\s*content",
            r"net\s*qty",
        ],
    )

    if not raw_value:
        return None

    match = QUANTITY_PATTERN.search(raw_value[:30])

    return match.group(0).strip() if match else None


def _extract_mrp(text: str) -> str | None:
    raw_value = _extract_label_value(
        text,
        [
            r"maximum\s*retail\s*price",
            r"mrp",
            r"retail\s*price",
        ],
    )

    if not raw_value:
        return None

    match = re.match(
        r"(?i)^(?:(?:₹|rs\.?|inr)\s*)?\d+(?:[.,]\d{1,2})?",
        raw_value.strip(),
    )

    if not match:
        return None

    candidate = match.group(0).strip()

    # A price must contain at least one digit.
    return candidate if any(c.isdigit() for c in candidate) else None


def _extract_batch(text: str) -> str | None:
    raw_value = _extract_label_value(
        text,
        [r"batch\s*(?:no|number)", r"lot\s*(?:no|number)"],
    )

    if not raw_value:
        return None

    candidate = raw_value.split()[0].strip(" :.,-")

    if get_field_status("batch_number", candidate) != "extracted":
        return None

    return candidate


def _extract_consumer_care(text: str) -> str | None:
    """Extract a readable email address or contact number."""

    email = re.search(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        text,
    )

    if email:
        return email.group(0)

    phone = re.search(
        r"(?<!\d)(?:\+91[-\s]?)?"
        r"(?:1800[-\s]?\d{3}[-\s]?\d{3,4}|"
        r"\d{2,5}[-\s]?\d{6,8}|"
        r"[6-9]\d{9})(?!\d)",
        text,
    )

    return phone.group(0).strip() if phone else None


def _extract_country(text: str) -> str | None:
    """Recognise country declarations such as PRODUCT OF INDIA."""

    patterns = [
        r"\bproduct\s+of\s+([A-Za-z][A-Za-z ]{1,25})",
        r"\bmade\s+in\s+([A-Za-z][A-Za-z ]{1,25})",
        r"\bcountry\s+of\s+origin\s*[:\-]?\s*"
        r"([A-Za-z][A-Za-z ]{1,25})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = match.group(1).strip(" \t\r\n:.,-")

            # Avoid capturing the following sentence or OCR content.
            value = value.split()[0] if value else ""

            if value:
                return value.title()

    return None


def _extract_single_result(text: str) -> ExtractedProductFields:
    return ExtractedProductFields(
        product_name=_extract_label_value(
            text, [r"product\s*name", r"item\s*name"]
        ),
        batch_number=_extract_batch(text),
        manufacturing_date=_extract_date(
            text,
            [
                r"manufacturing\s*date",
                r"date\s*of\s*manufacture",
                r"manufactured",
                r"mfg[\s.,]*date",
            ],
        ),
        expiry_date=_extract_date(
            text,
            [
                r"expiry\s*date",
                r"expiration\s*date",
                r"date\s*of\s*expiry",
                r"best\s*before",
                r"use\s*(?:before|by)",
            ],
        ),
        manufacturer=_extract_label_value(
            text,
            [
                r"manufactured\s*&\s*marketed\s*by",
                r"manufactured\s*by",
                r"marketed\s*by",
                r"manufacturer",
                r"packed\s*by",
                r"imported\s*by",
            ],
        ),
        address=_extract_label_value(
            text,
            [
                r"registered\s*address",
                r"manufacturing\s*address",
                r"factory\s*address",
                r"address",
            ],
        ),
        net_quantity=_extract_quantity(text),
        mrp=_extract_mrp(text),
        consumer_care=_extract_consumer_care(text),
        country_of_origin=_extract_country(text),
    )


def _choose_field(
    field_name: str,
    results: list[tuple[ExtractedProductFields, float | None]],
) -> str | None:
    """Choose a field value using validation and OCR confidence."""

    candidates = []

    for extracted_fields, confidence in results:
        value = getattr(extracted_fields, field_name)

        if not value:
            continue

        if field_name in {
            "batch_number",
            "manufacturing_date",
            "expiry_date",
            "net_quantity",
            "mrp",
        }:
            if get_field_status(field_name, value) != "extracted":
                continue

        # Use a neutral weight when OCR confidence is unavailable.
        weight = confidence if confidence is not None else 0.0

        candidates.append((value, weight))

    if not candidates:
        return None

    scores = {}

    for value, confidence in candidates:
        if value not in scores:
            scores[value] = {"score": 0.0, "count": 0}

        scores[value]["score"] += confidence
        scores[value]["count"] += 1

    return max(
        scores,
        key=lambda value: (
            scores[value]["score"],
            scores[value]["count"],
        ),
    )

def extract_product_fields(
    ocr_text: str | list[str] | list[OCRCandidate],
) -> ExtractedProductFields:
    """Extract fields using OCR candidates and their confidence scores."""

    if isinstance(ocr_text, str):
        texts = [(ocr_text, None)]
    else:
        texts = [
            (
                item.text,
                item.confidence,
            ) if isinstance(item, OCRCandidate) else (item, None)
            for item in ocr_text
        ]

    results = [
        (_extract_single_result(text or ""), confidence)
        for text, confidence in texts
    ]

    if not results:
        return _extract_single_result("")

    field_names = [
        "product_name",
        "batch_number",
        "manufacturing_date",
        "expiry_date",
        "manufacturer",
        "address",
        "net_quantity",
        "mrp",
        "consumer_care",
        "country_of_origin",
    ]

    selected = {
        name: _choose_field(name, results)
        for name in field_names
    }

    return ExtractedProductFields(**selected)