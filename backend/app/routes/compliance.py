
"""API routes for compliance screening."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.models.enums import OverallResult
from app.schemas.compliance import (
    ComplianceResultsResponse,
    ComplianceRunResponse,
    RuleDefinitionRead,
)
from app.services import inspection_service
from app.services.compliance_service import (
    get_compliance_results,
    run_compliance_checks,
)
from app.services.rule_engine import RULE_DEFINITIONS, RULE_VERSION

router = APIRouter(tags=["compliance"])

DbSession = Annotated[Session, Depends(get_db)]


def _load_inspection(db: Session, user, inspection_id: int):
    try:
        return inspection_service.get_accessible_inspection(
            db, user, inspection_id
        )
    except inspection_service.InspectionNotFound:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Inspection not found",
        ) from None


@router.get(
    "/rules",
    response_model=list[RuleDefinitionRead],
    summary="List configured declaration screening checks",
)
def list_rules(
    current_user: CurrentUser,
) -> list[RuleDefinitionRead]:
    return [
        RuleDefinitionRead(
            rule_id=rule.rule_id,
            name=rule.name,
            field_name=rule.field_name,
            description=rule.description,
            rule_version=RULE_VERSION,
            rule_type="Declaration presence screening",
            legal_verification="Not legally verified; administrative screening only",
        )
        for rule in RULE_DEFINITIONS
    ]


@router.post(
    "/inspections/{inspection_id}/compliance/run",
    response_model=ComplianceRunResponse,
    summary="Run compliance screening checks",
)
def run_inspection_compliance(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    inspection = _load_inspection(db, current_user, inspection_id)

    return run_compliance_checks(
        db,
        inspection=inspection,
        user=current_user,
    )


@router.get(
    "/inspections/{inspection_id}/compliance",
    response_model=ComplianceResultsResponse,
    summary="Get saved compliance screening results",
)
def read_inspection_compliance(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    _load_inspection(db, current_user, inspection_id)

    results = get_compliance_results(db, inspection_id)

    if not results["rules"]:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Compliance results not found. Run compliance checks first.",
        )

    return results
