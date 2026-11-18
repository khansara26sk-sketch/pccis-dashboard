"""Extract important product fields from OCR text."""

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class ExtractedProductFields:
    product_name: str | None
    batch_number: str | None
    manufacturing_date: str | None
    expiry_date: str | None


def _extract_label_value(text: str, labels: list[str]) -> str | None:
    """Extract a value appearing after a known label."""
    for line in text.splitlines():
        line = line.strip()

        if not line:
            continue

        for label in labels:
            pattern = rf"(?i)\b{label}\b\s*[:\-]?\s*(.+)$"
            match = re.search(pattern, line)

            if match:
                value = match.group(1).strip(" :-")
                if value:
                    return value

    return None


def extract_product_fields(ocr_text: str) -> ExtractedProductFields:
    """Extract product name, batch number and product dates from OCR text."""

    text = ocr_text or ""

    product_name = _extract_label_value(
        text,
        [
            r"product\s*name",
            r"product",
            r"item\s*name",
        ],
    )

    batch_number = _extract_label_value(
        text,
        [
            r"batch\s*(?:no|number)",
            r"batch",
            r"lot\s*(?:no|number)",
            r"lot",
        ],
    )

    manufacturing_date = _extract_label_value(
        text,
        [
            r"manufacturing\s*date",
            r"date\s*of\s*manufacture",
            r"mfg\s*date",
            r"mfg",
            r"manuf(?:actured)?",
        ],
    )

    expiry_date = _extract_label_value(
        text,
        [
            r"expiry\s*date",
            r"expiration\s*date",
            r"date\s*of\s*expiry",
            r"exp\s*date",
            r"best\s*before",
            r"use\s*before",
            r"expires",
            r"expiry",
            r"exp",
        ],
    )

    return ExtractedProductFields(
        product_name=product_name,
        batch_number=batch_number,
        manufacturing_date=manufacturing_date,
        expiry_date=expiry_date,
    )
