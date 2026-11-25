
"""Extract important product fields from OCR text."""

from dataclasses import dataclass, field
from datetime import datetime
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
    field_confidences: dict[str, float | None] = field(default_factory=dict)


# -------------------------------------------------------------------
# Patterns
# -------------------------------------------------------------------

DATE_PATTERN = re.compile(
    r"\b(?:"
    r"\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}"
    r"|\d{4}[/.-]\d{1,2}[/.-]\d{1,2}"
    r"|\d{1,2}[/.-]\d{4}"
    r")\b"
)

QUANTITY_PATTERN = re.compile(
    r"\d+(?:\.\d+)?\s*"
    r"(?:mg|mcg|µg|kg|g(?:ms?)?|ml|l|litre|liter|ltr)\b",
    re.IGNORECASE,
)

MRP_PATTERN = re.compile(
    r"^(?:(?:₹|rs\.?|inr)\s*)?\d+(?:[.,]\d{1,2})?$",
    re.IGNORECASE,
)

BATCH_PATTERN = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9 /-]{1,29}$"
)

STRICT_BATCH_PATTERN = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9/-]{1,29}$"
)

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
    "%m/%Y", "%m-%Y", "%m.%Y",
    "%m/%y", "%m-%y",
    "%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d",
]


# -------------------------------------------------------------------
# Labels
# -------------------------------------------------------------------

ALL_LABELS = [
    r"product\s*name",
    r"item\s*name",
    r"product\s*description",
    r"product\b",

    r"batch\s*(?:no|number)?",
    r"b[\s.]*no[\s.]*",
    r"lot\s*(?:no|number)?",

    r"manufacturing\s*date",
    r"date\s*of\s*manufacture",
    r"date\s*of\s*mfg",
    r"date\s*of\s*mfd",
    r"manufactured",
    r"mfg[\s.,]*date",
    r"mfd[\s.,]*date",
    r"mfg(?![\s.]*by)",
    r"mfd(?![\s.]*by)",



    r"expiry\s*date",
    r"expiration\s*date",
    r"date\s*of\s*expiry",
    r"best\s*before",
    r"use\s*(?:before|by)|useby",

    r"manufactured\s*&\s*marketed\s*by",
    r"manufactured\s*by",
    r"mfd\.?\s*by",
    r"mfg\.?\s*by",
    r"marketed\s*by",
    r"packed\s*by",
    r"imported\s*by",
    r"manufacturer",

    r"registered\s*address",
    r"manufacturing\s*address",
    r"factory\s*address",
    r"address",

    r"net[\s.]*(?:quantity|weight|content|qty|wt)\b",
    r"maximum\s*retail\s*price",
    r"max(?:imum)?[\s.]*retail[\s.]*price",
    r"[wm]ax[\s.]*retail[\s.]*price",
    r"m\.?r\.?p\.?",
    r"mrp",
    r"retail\s*price",

    r"consumer\s*care",
    r"customer\s*care",
    r"consumer\s*complaint",
    r"customer\s*service",
    r"helpline",

    r"email",
    r"website",
    r"phone",
    r"telephone",
    r"contact\s*us",
    r"call\s*at",

    r"country\s*of\s*origin",
    r"made\s*in",
    r"product\s+of",

    r"pin\s*code",
    r"pin\b",
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
        try:
            num = float(value.replace(",", "."))
            if num <= 0:
                return "needs_review"
        except (ValueError, TypeError):
            return "needs_review"

        return (
            "extracted"
            if MRP_PATTERN.fullmatch(value)
            else "needs_review"
        )

    if field_name == "batch_number":
        invalid_values = {"rs", "re", "mrp", "usp", "and", "or"}

        if value.lower().rstrip(".") in invalid_values:
            return "needs_review"

        if " " in value:
            return (
                "needs_review"
                if BATCH_PATTERN.fullmatch(value)
                and any(c.isdigit() for c in value)
                else "needs_review"
            )

        return (
            "extracted"
            if STRICT_BATCH_PATTERN.fullmatch(value)
            and any(c.isdigit() for c in value)
            else "needs_review"
        )

    return "extracted"


# -------------------------------------------------------------------
# Shared label extraction
# -------------------------------------------------------------------

def _extract_label_value(text: str, labels: list[str]) -> str | None:
    """Extract a labelled value, stopping at another known field label."""

    current_pattern = "|".join(
        sorted(labels, key=len, reverse=True)
    )
    boundary_pattern = "|".join(
        sorted(ALL_LABELS, key=len, reverse=True)
    )

    pattern = (
        rf"(?i)(?<!\w)(?:{current_pattern})"
        rf"(?!\w)\s*[:.,\-#]?\s*"
        rf"(.*?)"
        rf"(?=\s*(?:\||\n|\r|"
        rf"(?<!\w)(?:{boundary_pattern})(?!\w)"
        rf"\s*[:.,\-#]?)|$)"
    )

    match = re.search(
        pattern,
        text,
        re.IGNORECASE | re.DOTALL,
    )

    if not match:
        return None

    value = match.group(1).strip(" \t\r\n:.,-#|")
    return value or None


# -------------------------------------------------------------------
# Date extraction
# -------------------------------------------------------------------

def _extract_date(
    text: str,
    labels: list[str],
    field_name: str = "manufacturing_date",
) -> str | None:

    raw_value = _extract_label_value(text, labels)

    if not raw_value:
        return None

    match = DATE_PATTERN.search(raw_value[:80])

    if not match:
        return None

    candidate = match.group(0)

    if get_field_status(field_name, candidate) == "not_detected":
        return None

    return candidate


# -------------------------------------------------------------------
# Quantity extraction
# -------------------------------------------------------------------

def _extract_quantity(text: str) -> str | None:

    raw_value = _extract_label_value(
        text,
        [
            r"net[\s.]*(?:quantity|weight|content|qty|wt)\b",
        ],
    )

    if not raw_value:
        return None

    first_line = raw_value.splitlines()[0].strip()

    if not first_line:
        return None

    promo_pattern = re.compile(
    r"(?i)\b\d+(?:\.\d+)?\s*"
    r"(?:mg|mcg|µg|kg|g(?:ms?)?|ml|l|litre|liter|ltr)"
    r"\s*\+\s*"
    r"\d+(?:\.\d+)?\s*"
    r"(?:mg|mcg|µg|kg|g(?:ms?)?|ml|l|litre|liter|ltr)?"
    r"(?:\s*(?:extra|free|bonus)s?"
    r")?"
)

    promo_match = promo_pattern.search(first_line)

    if promo_match:
        return promo_match.group(0).strip()

    match = QUANTITY_PATTERN.search(first_line[:50])

    return match.group(0).strip() if match else None


# -------------------------------------------------------------------
# MRP extraction
# -------------------------------------------------------------------



def _extract_mrp(text: str) -> str | None:
    raw_value = _extract_label_value(
        text,
        [
            r"maximum\s*retail\s*price",
            r"max(?:imum)?[\s.]*retail[\s.]*price",
            r"[wm]ax[\s.]*retail[\s.]*price",
            r"mrp",
            r"retail\s*price",
        ],
    )

    if not raw_value:
        return None

    print("DEBUG MRP RAW VALUE:", repr(raw_value))

    cleaned = raw_value.splitlines()[0].strip()

    # Correct common OCR decimal substitutions.
    cleaned = re.sub(
        r"(\d+)[.\s][oO]{2}\b",
        r"\1.00",
        cleaned,
    )

    cleaned = re.sub(
        r"(?i)(\d+)\s*[oO]\s*(\d{1,2})\b",
        r"\1.0\2",
        cleaned,
    )

    # Remove currency symbols and OCR noise.
    cleaned = re.sub(
        r"(?i)^\s*(?:₹|rs\.?|inr)\s*",
        "",
        cleaned,
    )
    cleaned = cleaned.lstrip(" :. =~*®-")

    match = re.search(
        r"(?<!\d)(\d{1,7}(?:[.,]\d{1,2})?)(?!\d)",
        cleaned,
    )

    if not match:
        return None

    return match.group(1).replace(",", ".")




# -------------------------------------------------------------------
# Batch number extraction
# -------------------------------------------------------------------

def _extract_batch(text: str) -> str | None:
    """Extract labelled batch identifiers while rejecting explanatory prose."""

    label_pattern = re.compile(
        r"(?i)(?<!\w)(?:"
        r"batch(?:\s*(?:no|number)\.?)?"
        r"|lot(?:\s*(?:no|number)\.?)?"
        r"|b\s*\.?\s*no\.?"
        r")\s*[:#.-]?\s*"
    )

    invalid_tokens = {
        "indicates", "represents", "character", "characters",
        "manufacturing", "manufactured", "unit", "printed",
        "packaging", "material", "details",
    }

    boundary_pattern = re.compile(
        r"(?i)\b(?:pkd|mfg|mfd|mrp|expiry|"
        r"use\s*by|best\s*before|manufacturing|"
        r"consumer\s*care|manufacturer|phone|email)\b"
    )

    for match in label_pattern.finditer(text):
        raw_value = text[match.end():match.end() + 60]

        raw_value = raw_value.split("|", 1)[0]
        raw_value = raw_value.splitlines()[0]

        boundary = boundary_pattern.search(raw_value)

        if boundary:
            raw_value = raw_value[:boundary.start()]

        candidate = raw_value.strip(" :.,;-()[]{}'\"")

        if not candidate or len(candidate) > 30:
            continue

        if not BATCH_PATTERN.fullmatch(candidate):
            continue

        words = candidate.split()

        if any(
            word.lower().strip(".,:") in invalid_tokens
            for word in words
        ):
            continue

        if not any(char.isdigit() for char in candidate):
            continue

        return candidate

    return None


# -------------------------------------------------------------------
# Manufacturer extraction
# -------------------------------------------------------------------

def _extract_manufacturer(text: str) -> str | None:
    """Extract manufacturer name from labelled or corporate-name text."""

    raw_value = _extract_label_value(
        text,
        [
            r"manufactured\s*&\s*marketed\s*by",
            r"manufactured\s*by",
            r"mfd\.?\s*by",
            r"mfg\.?\s*by",
            r"marketed\s*by",
            r"packed\s*by",
            r"imported\s*by",
            r"manufacturer",
        ],
    )

    if raw_value:
        first_line = raw_value.splitlines()[0].strip(" :.,-'\"")

        words = [
            word.lower().strip(" :.,-'\"")
            for word in first_line.split()
        ]

        if (
            len(first_line) >= 4
            and any(char.isalpha() for char in first_line)
            and words
            and words[0] not in {"or", "and", "email", "phone"}
        ):
            return first_line[:60].strip(" :.,-")

    company_pattern = re.compile(
        r"\b([A-Z][A-Za-z0-9&.,'\s]{2,45}?\b(?:"
        r"PVT\.?\s*LTD\.?|"
        r"PRIVATE\s*LIMITED|"
        r"PRI\s*VATE\s*LIMITED|"
        r"LIMITED|"
        r"LTD\.?|"
        r"LLP|"
        r"PVT\.?"
        r"))\b",
        re.IGNORECASE,
    )

    for line in text.splitlines():
        line = line.strip(" :.,-|")

        if not line or re.search(r"(?i)pkg\.?\s*material", line):
            continue

        match = company_pattern.search(line)

        if match:
            candidate = match.group(1).strip(" :.,-")

            candidate = re.sub(
                r"(?i)^(?:consumer care cell|customer care cell|"
                r"ted|cell|of|the|by|at|for|from|and)\s+",
                "",
                candidate,
            ).strip(" :.,-")

            if len(candidate) >= 5 and not candidate.lower().startswith("re."):
                return candidate

    return None


# -------------------------------------------------------------------
# Address extraction
# -------------------------------------------------------------------

def _extract_address(text: str) -> str | None:
    """Extract manufacturer address separately from company and contact details."""

    raw_value = _extract_label_value(
        text,
        [
            r"registered\s*address",
            r"manufacturing\s*address",
            r"factory\s*address",
            r"address",
        ],
    )

    if raw_value:
        first_line = raw_value.splitlines()[0].strip(" :.,-")

        if len(first_line) >= 5:
            return first_line[:80].strip(" :.,-")

    meta_exclude = re.compile(
        r"(?i)\b(?:mrp|retail\s*price|net\s*(?:weight|wt|qty|quantity)|"
        r"batch|b\.?no|mfg|pkd|use\s*by|best\s*before|"
        r"nutrition|energy)\b"
    )

    pin_pattern = re.compile(
        r"\b(?:[A-Z]{2}[-\s]?)?[1-8]\d{5}\b"
    )

    addr_kw_pattern = re.compile(
        r"(?i)\b(?:north\s*level\s*crossin[g]?|industrial\s*area|"
        r"plot\s*no\.?|sector\s*\d+|road|marg|vile\s*parle|"
        r"mumbai|delhi|kolkata|chennai|bangalore|bengaluru|"
        r"noida|gurgaon|gurugram|ghaziabad|faridabad)\b"
    )

    for line in text.splitlines():
        line = line.strip(" :.,-|")

        if len(line) < 10 or meta_exclude.search(line):
            continue

        if pin_pattern.search(line) or addr_kw_pattern.search(line):

            if re.search(r"(?i)fssai|lic\b|regn", line):
                continue

            cleaned = re.sub(
                r"(?i)^(?:[A-Za-z0-9&.,'\s]{2,45}?\b"
                r"(?:PVT\.?\s*LTD\.?|PRIVATE\s*LIMITED|"
                r"LIMITED|LTD\.?|LLP|PVT)\.?)[\s:,-]*",
                "",
                line,
            )

            cleaned = re.sub(
                r"\s*\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b.*$",
                "",
                cleaned,
            )

            cleaned = re.sub(
                r"(?i)\s*\b(?:phone|tel|call)[\s.:]*\d+.*$",
                "",
                cleaned,
            )

            cleaned = cleaned.strip(" :.,-")

            if len(cleaned) >= 5:
                return cleaned[:80].strip(" :.,-")

    return None


# -------------------------------------------------------------------
# Consumer care
# -------------------------------------------------------------------

def _extract_consumer_care(text: str) -> str | None:

    labels = re.compile(
        r"(?i)consumer\s*care|customer\s*care|"
        r"consumer\s*complaint|customer\s*service|"
        r"helpline|contact\s*us|call\s*at"
    )

    email_pattern = re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    )

    phone_pattern = re.compile(
        r"(?<!\d)(?:"
        r"\+?91[-\s]?\d{2,4}[-\s]?\d{6,8}|"
        r"0\d{2,4}[-\s]?\d{6,8}|"
        r"[6-9]\d{9}|"
        r"1800[-\s]?\d{3}[-\s]?\d{3,4}"
        r")(?!\d)"
    )

    for match in labels.finditer(text):
        nearby_text = text[match.end():match.end() + 200]

        email = email_pattern.search(nearby_text)

        if email:
            return email.group(0)

        phone = phone_pattern.search(nearby_text)

        if phone:
            return phone.group(0)

    email = email_pattern.search(text)

    if email:
        return email.group(0)

    return None


# -------------------------------------------------------------------
# Country of origin
# -------------------------------------------------------------------

def _extract_country(text: str) -> str | None:

    patterns = [
        r"\bproduct\s+of\s+([A-Za-z][A-Za-z ]{1,25})",
        r"\bmade\s+in\s+([A-Za-z][A-Za-z ]{1,25})",
        r"\bcountry\s+of\s+origin\s*[:\-]?\s*"
        r"([A-Za-z][A-Za-z ]{1,25})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = match.group(1).strip(" \t\r\n:.,-|")

            value = re.split(
                r"(?i)\b(?:batch|mrp|pkd|mfg|mfd|"
                r"manufactured|consumer|address|net)\b",
                value,
            )[0].strip()

            value = value.split()[0] if value else ""

            if value:
                return value.title()

    return None


# -------------------------------------------------------------------
# Extract all fields from one OCR result
# -------------------------------------------------------------------

def _extract_single_result(text: str) -> ExtractedProductFields:

    return ExtractedProductFields(
        product_name=_extract_label_value(
            text,
            [
                r"product\s*name",
                r"item\s*name",
                r"product\s*description",
                r"product",
            ],
        ),

        batch_number=_extract_batch(text),

        manufacturing_date=_extract_date(
            text,
            [
                r"manufacturing\s*date",
                r"date\s*of\s*manufacture",
                r"date\s*of\s*mfg",
                r"date\s*of\s*mfd",

                r"manufactured",
                r"mfg[\s.,]*date",
                r"mfd[\s.,]*date",

                r"mfg",
                r"mfd",


            ],
            field_name="manufacturing_date",
        ),

        expiry_date=_extract_date(
            text,
            [
                r"expiry\s*date",
                r"expiration\s*date",
                r"date\s*of\s*expiry",
                r"best\s*before",
                r"use\s*(?:before|by)|useby",
            ],
            field_name="expiry_date",
        ),

        manufacturer=_extract_manufacturer(text),
        address=_extract_address(text),
        net_quantity=_extract_quantity(text),
        mrp=_extract_mrp(text),
        consumer_care=_extract_consumer_care(text),
        country_of_origin=_extract_country(text),
    )


# -------------------------------------------------------------------
# Candidate selection
# -------------------------------------------------------------------

def _choose_field(
    field_name: str,
    results: list[tuple[ExtractedProductFields, float | None]],
) -> str | None:
    """Choose a field using validation and OCR confidence."""

    extracted_candidates: list[tuple[str, float]] = []
    needs_review_candidates: list[tuple[str, float]] = []

    for extracted_fields, confidence in results:

        value = getattr(extracted_fields, field_name, None)

        if not value or not str(value).strip():
            continue

        value = str(value).strip()
        status = get_field_status(field_name, value)

        if status == "not_detected":
            continue

        weight = confidence if confidence is not None else 0.0

        if status == "extracted":
            extracted_candidates.append((value, weight))

        elif status == "needs_review":
            needs_review_candidates.append((value, weight))

    candidates = (
        extracted_candidates
        if extracted_candidates
        else needs_review_candidates
    )

    if not candidates:
        return None

    scores: dict[str, dict[str, float]] = {}

    for value, confidence in candidates:

        if value not in scores:
            scores[value] = {"score": 0.0, "count": 0}

        scores[value]["score"] += confidence
        scores[value]["count"] += 1

    return max(
        scores,
        key=lambda val: (
            scores[val]["score"],
            scores[val]["count"],
        ),
    )


# -------------------------------------------------------------------
# Field confidence
# -------------------------------------------------------------------

def _compute_field_confidence(
    field_name: str,
    field_value: str | None,
    results: list[tuple[ExtractedProductFields, float | None]],
) -> float | None:
    """Compute field-specific confidence from OCR confidence and validation."""

    if not field_value or not str(field_value).strip():
        return None

    status = get_field_status(field_name, field_value)

    if status == "not_detected":
        return None

    matching_confidences = [
        conf
        for fields, conf in results
        if getattr(fields, field_name, None) == field_value
        and conf is not None
    ]

    base_conf = (
        sum(matching_confidences) / len(matching_confidences)
        if matching_confidences
        else None
    )

    if base_conf is None:
        return 85.0 if status == "extracted" else 60.0

    if status == "extracted":
        return round(min(base_conf, 99.0), 1)

    discounted = base_conf * 0.75

    return round(max(30.0, min(discounted, 70.0)), 1)


# -------------------------------------------------------------------
# Public extraction function
# -------------------------------------------------------------------

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

    field_confidences = {
        name: _compute_field_confidence(
            name,
            selected[name],
            results,
        )
        for name in field_names
    }

    return ExtractedProductFields(
        **selected,
        field_confidences=field_confidences,
    )
