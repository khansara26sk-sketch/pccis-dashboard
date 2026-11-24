"""Service for running and storing compliance screening results."""

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models import (
    ExtractedField,
    ImageEvidence,
    Inspection,
    OCRStatus,
    OverallResult,
    RuleResult,
    RuleStatus,
    User,
)
from app.services.audit_service import record_event
from app.services.rule_engine import (
    RULE_DEFINITIONS,
    RuleEvaluation,
    evaluate_all_rules,
)


def _get_extracted_fields(
    db: Session,
    inspection_id: int,
) -> dict[str, str | None]:
    """Get the latest usable extracted value for each field."""

    statement = (
        select(ExtractedField)
        .outerjoin(
            ImageEvidence,
            ExtractedField.evidence_id == ImageEvidence.id,
        )
        .where(
            ExtractedField.inspection_id == inspection_id,
            or_(
                ExtractedField.evidence_id.is_(None),
                ExtractedField.manually_corrected.is_(True),
                ImageEvidence.ocr_status == OCRStatus.COMPLETED,
            ),
        )
        .order_by(
            ExtractedField.manually_corrected.desc(),
            ExtractedField.created_at.desc(),
            ExtractedField.id.desc(),
        )
    )

    extracted_fields = db.scalars(statement).all()

    result: dict[str, str | None] = {}

    for field in extracted_fields:
        if field.field_name not in result:
            value = field.extracted_value
            result[field.field_name] = (
                value.strip() if isinstance(value, str) else value
            )

    return result


def _calculate_overall_result(
    evaluations: list[RuleEvaluation],
) -> OverallResult:
    """Calculate a screening result, not a legal compliance decision."""

    if any(
        evaluation.status == RuleStatus.NOT_DETECTED
        for evaluation in evaluations
    ):
        return OverallResult.POTENTIAL_ISSUE

    return OverallResult.MANUAL_REVIEW


def run_compliance_checks(
    db: Session,
    inspection: Inspection,
    user: User,
) -> dict:
    """Run declaration-presence checks and persist their results."""

    extracted_fields = _get_extracted_fields(db, inspection.id)
    has_extraction_records = bool(extracted_fields)

    # Map OCR field names to compliance rule field names without overriding manual corrections.
    if not extracted_fields.get("manufacturer_packer"):
        extracted_fields["manufacturer_packer"] = extracted_fields.get("manufacturer")

    if not extracted_fields.get("manufacturer_address"):
        extracted_fields["manufacturer_address"] = extracted_fields.get("address")

    if not extracted_fields.get("packaging_date"):
        extracted_fields["packaging_date"] = (
            extracted_fields.get("manufacturing_date")
            or extracted_fields.get("packed_date")
        )

    has_usable_extraction = any(
    value is not None and str(value).strip()
    for value in extracted_fields.values()
)

    if has_extraction_records:
        evaluations = evaluate_all_rules(extracted_fields)
    else:
        evaluations = [
            RuleEvaluation(
                rule_id=rule.rule_id,
                rule_version="1.0",
                field_name=rule.field_name,
                status=RuleStatus.MANUAL_REVIEW,
                explanation=(
                    "No usable extracted declaration data is available. "
                    "Review the package image manually or complete OCR processing."
                ),
                evidence_text=None,
            )
            for rule in RULE_DEFINITIONS
        ]

    db.execute(
        delete(RuleResult).where(
            RuleResult.inspection_id == inspection.id
        )
    )

    for evaluation in evaluations:
        db.add(
            RuleResult(
                inspection_id=inspection.id,
                rule_id=evaluation.rule_id,
                rule_version=evaluation.rule_version,
                field_name=evaluation.field_name,
                status=evaluation.status,
                explanation=evaluation.explanation,
                evidence_text=evaluation.evidence_text,
            )
        )

    overall_result = _calculate_overall_result(evaluations)
    inspection.overall_result = overall_result

    record_event(
        db,
        user_id=user.id,
        inspection_id=inspection.id,
        action="compliance.checks_completed",
        details={
            "overall_result": overall_result.value,
            "rules_evaluated": len(evaluations),
        },
    )

    db.commit()

    return {
        "inspection_id": inspection.id,
        "overall_result": overall_result,
        "rules": evaluations,
        "potential_issues": [
            evaluation
            for evaluation in evaluations
            if evaluation.status == RuleStatus.NOT_DETECTED
        ],
        "disclaimer": (
            "These are automated declaration-presence screening results only. "
            "They do not establish statutory compliance or a legal violation. "
            "Final verification must be performed by an authorized officer."
        ),
    }


def get_compliance_results(
    db: Session,
    inspection_id: int,
) -> dict:
    """Retrieve previously saved compliance results."""

    results = list(
        db.scalars(
            select(RuleResult)
            .where(RuleResult.inspection_id == inspection_id)
            .order_by(RuleResult.rule_id)
        ).all()
    )

    return {
        "inspection_id": inspection_id,
        "overall_result": db.get(Inspection, inspection_id).overall_result,
        "rules": results,
        "potential_issues": [
            result
            for result in results
            if result.status == RuleStatus.NOT_DETECTED
        ],
        "disclaimer": (
            "These are automated declaration-presence screening results only. "
            "They do not establish statutory compliance or a legal violation. "
            "Final verification must be performed by an authorized officer."
        ),
    }