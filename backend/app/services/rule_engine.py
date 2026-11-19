"""Administrative declaration-presence screening rules.

These checks identify extracted declaration text only.
They do not determine statutory compliance or legal violations.
"""

from dataclasses import dataclass

from app.models.enums import RuleStatus


@dataclass(frozen=True)
class RuleDefinition:
    rule_id: str
    name: str
    field_name: str
    description: str


@dataclass(frozen=True)
class RuleEvaluation:
    rule_id: str
    rule_version: str
    field_name: str
    status: RuleStatus
    explanation: str
    evidence_text: str | None


RULE_VERSION = "1.0"

RULE_DEFINITIONS = (
    RuleDefinition(
        rule_id="DECL-001",
        name="Product Name",
        field_name="product_name",
        description="Checks whether product name text was extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-002",
        name="Manufacturer / Packer",
        field_name="manufacturer_packer",
        description="Checks whether manufacturer or packer details were extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-003",
        name="Address",
        field_name="manufacturer_address",
        description="Checks whether address text was extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-004",
        name="Net Quantity",
        field_name="net_quantity",
        description="Checks whether net quantity text was extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-005",
        name="MRP",
        field_name="mrp",
        description="Checks whether MRP text was extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-006",
        name="Packaging Date",
        field_name="packaging_date",
        description="Checks whether packaging date text was extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-007",
        name="Consumer Care",
        field_name="consumer_care",
        description="Checks whether consumer care details were extracted.",
    ),
    RuleDefinition(
        rule_id="DECL-008",
        name="Country of Origin",
        field_name="country_of_origin",
        description="Checks whether country of origin text was extracted.",
    ),
)


def evaluate_rule(
    rule: RuleDefinition,
    extracted_value: str | None,
) -> RuleEvaluation:
    """Evaluate presence of extracted text, without making a legal determination."""

    value = extracted_value.strip() if extracted_value else None

    if value:
        status = RuleStatus.MANUAL_REVIEW
        explanation = (
            "Declaration text detected. Verify its accuracy and applicability "
            "against the current official requirements."
        )
    else:
        status = RuleStatus.NOT_DETECTED
        explanation = (
            "Declaration text was not detected in the available extracted fields. "
            "Check the original package image and OCR results manually."
        )

    return RuleEvaluation(
        rule_id=rule.rule_id,
        rule_version=RULE_VERSION,
        field_name=rule.field_name,
        status=status,
        explanation=explanation,
        evidence_text=value,
    )


def evaluate_all_rules(
    extracted_fields: dict[str, str | None],
) -> list[RuleEvaluation]:
    """Evaluate all configured declaration-presence checks."""

    return [
        evaluate_rule(rule, extracted_fields.get(rule.field_name))
        for rule in RULE_DEFINITIONS
    ]