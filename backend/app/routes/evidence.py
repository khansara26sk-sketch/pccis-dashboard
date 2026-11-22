
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from fastapi import Body
from sqlalchemy import select

from app.models.extracted_field import ExtractedField

from app.config import Settings, get_settings
from app.database import get_db
from app.dependencies.auth import CurrentUser
from app.models import ImageEvidence, Inspection, PreprocessingStatus
from app.schemas.evidence import EvidenceRead
from app.schemas.ocr import OCRResultRead
from app.services import evidence_service, inspection_service, ocr_result_service
from app.services.image_service import InvalidImageContent, UnsupportedImageType
from app.services.storage_service import StorageError

router = APIRouter(prefix="/inspections/{inspection_id}/evidence", tags=["evidence"])

DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

COMMON_ERRORS = {
    401: {"description": "Missing, invalid or expired access token"},
    404: {"description": "Inspection or evidence not found (or not yours)"},
}

NO_CACHE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
}


def _load_inspection(db: Session, user, inspection_id: int) -> Inspection:
    try:
        return inspection_service.get_accessible_inspection(
            db, user, inspection_id
        )
    except inspection_service.InspectionNotFound:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Inspection not found",
        ) from None


def _load_evidence(
    db: Session,
    inspection: Inspection,
    evidence_id: int,
) -> ImageEvidence:
    try:
        return evidence_service.get_evidence(
            db, inspection, evidence_id
        )
    except evidence_service.EvidenceNotFound:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Evidence not found",
        ) from None


def _to_read(evidence: ImageEvidence) -> EvidenceRead:
    base = (
        f"/api/inspections/{evidence.inspection_id}"
        f"/evidence/{evidence.id}"
    )

    has_processed = (
        evidence.preprocessing_status == PreprocessingStatus.COMPLETED
        and evidence.processed_stored_filename is not None
    )

    return EvidenceRead.model_validate(evidence).model_copy(
        update={
            "original_url": f"{base}/original",
            "processed_url": (
                f"{base}/processed" if has_processed else None
            ),
        }
    )


def _image_response(
    path: Path | None,
    media_type: str,
) -> FileResponse:
    if path is None or not path.is_file():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Image file is not available",
        )

    return FileResponse(
        path,
        media_type=media_type,
        headers=NO_CACHE_HEADERS,
    )


@router.post(
    "",
    response_model=EvidenceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an evidence image",
    description=(
        "Uploads a package image (JPEG, PNG or WebP) to an inspection "
        "you own (Admins may upload to any inspection). The extension, "
        "MIME type and actual image contents are validated. The original "
        "is stored untouched; a separate processed copy is created."
    ),
    responses={
        **COMMON_ERRORS,
        409: {"description": "Maximum number of images reached"},
        413: {"description": "File exceeds the configured size limit"},
        415: {"description": "File extension or MIME type is not allowed"},
        422: {"description": "File contents are not a valid image"},
    },
)
def upload_evidence(
    inspection_id: int,
    file: Annotated[
        UploadFile,
        File(description="The image file (JPEG, PNG or WebP)"),
    ],
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> EvidenceRead:
    inspection = _load_inspection(db, current_user, inspection_id)
    allowed = ", ".join(
        fmt.upper() for fmt in settings.allowed_image_formats
    )

    try:
        evidence = evidence_service.upload_evidence(
            db,
            settings=settings,
            inspection=inspection,
            user=current_user,
            filename=file.filename,
            content_type=file.content_type,
            fileobj=file.file,
        )

    except UnsupportedImageType:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type. Allowed formats: {allowed}.",
        ) from None

    except evidence_service.FileTooLarge:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File is too large. Maximum size is "
            f"{settings.max_upload_size_mb} MB.",
        ) from None

    except InvalidImageContent:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"The file is not a valid image of an allowed format ({allowed}).",
        ) from None

    except evidence_service.EvidenceLimitReached:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This inspection already has the maximum of "
            f"{settings.max_images_per_inspection} images.",
        ) from None

    except StorageError:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Could not store the image",
        ) from None

    return _to_read(evidence)


@router.get(
    "",
    response_model=list[EvidenceRead],
    summary="List evidence for an inspection",
    responses=COMMON_ERRORS,
)
def list_evidence(
    inspection_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> list[EvidenceRead]:
    inspection = _load_inspection(db, current_user, inspection_id)

    return [
        _to_read(evidence)
        for evidence in evidence_service.list_evidence(db, inspection)
    ]


@router.get(
    "/{evidence_id}",
    response_model=EvidenceRead,
    summary="Get evidence metadata",
    responses=COMMON_ERRORS,
)
def get_evidence(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> EvidenceRead:
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    return _to_read(evidence)


@router.get(
    "/{evidence_id}/ocr",
    response_model=OCRResultRead,
    summary="Get OCR result for evidence",
    responses=COMMON_ERRORS,
)
def get_ocr_result(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> OCRResultRead:
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    result = ocr_result_service.get_ocr_result(
        db,
        evidence=evidence,
    )

    return OCRResultRead.model_validate(result)

@router.get(
    "/{evidence_id}/fields",
    summary="Get structured product fields",
)
def get_structured_fields(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    result = ocr_result_service.get_structured_fields(
        db,
        evidence=evidence,
    )

    return result

@router.patch(
    "/{evidence_id}/fields",
    summary="Manually correct extracted product fields",
    responses=COMMON_ERRORS,
)
def update_structured_fields(
    inspection_id: int,
    evidence_id: int,
    corrections: dict[str, str | None] = Body(...),
    current_user: CurrentUser = None,
    db: DbSession = None,
):
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    allowed_fields = {
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
    }

    if not corrections:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for correction",
        )

    invalid_fields = set(corrections) - allowed_fields

    if invalid_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fields: {', '.join(sorted(invalid_fields))}",
        )

    for field_name, value in corrections.items():
        record = db.scalar(
            select(ExtractedField).where(
                ExtractedField.evidence_id == evidence.id,
                ExtractedField.field_name == field_name,
            )
        )

        if record is None:
            record = ExtractedField(
                inspection_id=inspection.id,
                evidence_id=evidence.id,
                field_name=field_name,
            )
            db.add(record)

        record.extracted_value = value.strip() if value else None
        record.manually_corrected = True
        record.corrected_by = current_user.id

    db.commit()

    return ocr_result_service.get_structured_fields(
        db,
        evidence=evidence,
    )

@router.get(
    "/{evidence_id}/processed",
    response_class=FileResponse,
    summary="Download the processed image (PNG)",
    description=(
        "Returns the grayscale, contrast-enhanced copy. "
        "404 if preprocessing has not completed."
    ),
    responses={
        **COMMON_ERRORS,
        200: {"content": {"image/png": {}}},
    },
)
def get_processed_image(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
):
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    try:
        path = evidence_service.processed_path(settings, evidence)
    except StorageError:
        path = None

    return _image_response(path, "image/png")


@router.get(
    "/{evidence_id}/original",
    response_class=FileResponse,
    summary="Download the original image, exactly as uploaded",
    responses={
        **COMMON_ERRORS,
        200: {
            "content": {
                "image/jpeg": {},
                "image/png": {},
                "image/webp": {},
            }
        },
    },
)
def get_original_image(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
):
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    try:
        path = evidence_service.original_path(settings, evidence)
    except StorageError:
        path = None

    return _image_response(path, evidence.content_type)


@router.post(
    "/{evidence_id}/preprocess",
    response_model=EvidenceRead,
    summary="Re-run preprocessing",
    description=(
        "Rebuilds the processed copy from the stored original using "
        "the current settings. The original is never modified."
    ),
    responses=COMMON_ERRORS,
)
def reprocess_evidence(
    inspection_id: int,
    evidence_id: int,
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> EvidenceRead:
    inspection = _load_inspection(db, current_user, inspection_id)
    evidence = _load_evidence(db, inspection, evidence_id)

    evidence_service.run_preprocessing(
        db,
        settings=settings,
        evidence=evidence,
        user=current_user,
    )

    return _to_read(evidence)
