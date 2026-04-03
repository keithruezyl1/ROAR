"""Case CRUD and approval routes."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Security, UploadFile, File, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.middleware import get_current_user, get_current_user_optional, require_agent, require_approver, require_customer, require_escalation
from api.db.database import get_db
from api.db.models import Case, CaseProofUpload, ChatMessage, Policy, RefundRequest
from api.services.cases import generate_reference_number, validate_status_transition
from api.services.decision_matrix import (
    ALLOWED_RESOLUTION_PREFERENCES,
    allowed_preferences_for,
    default_preference_for,
    is_known_subtype,
    normalize_dispute_subtype,
    normalize_resolution_preference,
    subtype_expected_type,
)
from api.services.n8n import trigger_workflow
from api.services.proofs import (
    INVALID_REASON_CODES,
    MAX_PROOF_UPLOADS,
    analyze_proof_images,
    get_appeal_priority,
    get_customer_invalid_reason_message,
    requires_proof_for_case,
    validate_proof_upload,
)

router = APIRouter(prefix="/cases", tags=["cases"])

bearer_optional = HTTPBearer(auto_error=False)


class CaseCreateRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=50)
    dispute_type: str
    dispute_subtype: str | None = None
    resolution_preference: str | None = None
    customer_name: str = Field(min_length=2, max_length=100)
    customer_email: EmailStr = Field(max_length=200)
    intake_message: str = Field(min_length=10, max_length=1000)


class CaseCreateResponse(BaseModel):
    id: str
    reference_number: str
    status: str
    created_at: datetime


class CaseRejectRequest(BaseModel):
    reason: str = Field(min_length=50)
    policy_refs: list[str] | None = None


class CaseApproveResponse(BaseModel):
    status: str
    message: str


class CaseListResponse(BaseModel):
    cases: list[dict[str, Any]]
    total: int


class CaseInvalidateRequest(BaseModel):
    invalid_reason_code: str
    invalid_reason_detail: str | None = None
    message: str | None = None


class CaseProofUploadResponse(BaseModel):
    id: str
    case_id: str
    filename: str
    content_type: str
    byte_size: int
    image_width: int | None
    image_height: int | None
    sort_order: int
    created_at: datetime


def _proof_to_dict(upload: CaseProofUpload) -> dict[str, Any]:
    return {
        "id": str(upload.id),
        "case_id": str(upload.case_id),
        "filename": upload.filename,
        "content_type": upload.content_type,
        "byte_size": upload.byte_size,
        "image_width": upload.image_width,
        "image_height": upload.image_height,
        "sort_order": upload.sort_order,
        "created_at": upload.created_at,
    }


def _proof_asset_summary(upload: CaseProofUpload, case_id: str) -> dict[str, Any]:
    return {
        "proof_upload_id": str(upload.id),
        "filename": upload.filename,
        "content_type": upload.content_type,
        "byte_size": upload.byte_size,
        "image_width": upload.image_width,
        "image_height": upload.image_height,
        "sha256": upload.sha256,
        "sort_order": upload.sort_order,
        "download_path": f"/cases/{case_id}/proof-uploads/{upload.id}",
        "attachment_kind": "image",
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
    }


async def _load_order_items_for_proof_analysis(case: Case, db: AsyncSession) -> list[dict[str, Any]]:
    ordered_items: list[dict[str, Any]] = []

    if isinstance(case.information_bundle, dict):
        bundle = case.information_bundle
        items = bundle.get("order_items_detail")
        if not isinstance(items, list) or not items:
            items = bundle.get("order_items")
        if isinstance(items, list):
            ordered_items = [item for item in items if isinstance(item, dict)]

    if ordered_items:
        return ordered_items

    rows = (
        await db.execute(
            text(
                """
                SELECT
                    item_id,
                    item_name,
                    quantity,
                    unit_price
                FROM sim_order_items
                WHERE order_id = :oid
                """
            ),
            {"oid": case.order_id},
        )
    ).mappings().all()

    return [dict(row) for row in rows]


def _json_safe_debug_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    safe_items: list[dict[str, Any]] = []
    for item in items:
        safe_item: dict[str, Any] = {}
        for key, value in item.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                safe_item[key] = value
            else:
                safe_item[key] = str(value)
        safe_items.append(safe_item)
    return safe_items


def _build_evidence_bundle(case: Case) -> dict[str, Any]:
    proof_assets = [
        _proof_asset_summary(upload, str(case.id))
        for upload in sorted(case.proof_uploads, key=lambda item: item.sort_order)
    ]
    return {
        "proof_present": len(proof_assets) > 0,
        "proof_upload_count": len(proof_assets),
        "proof_uploads": proof_assets,
        "proof_analysis_status": case.proof_analysis_status,
        "proof_analysis": case.proof_analysis,
        "invalid_reason_code": case.invalid_reason_code,
        "invalid_reason_detail": case.invalid_reason_detail,
    }


def _sync_case_information_bundle(case: Case) -> None:
    bundle = dict(case.information_bundle or {})
    evidence_bundle = _build_evidence_bundle(case)
    bundle["proof_uploads"] = evidence_bundle["proof_uploads"]
    bundle["evidence_bundle"] = evidence_bundle
    case.information_bundle = bundle


def _merge_information_bundle(
    existing_bundle: dict[str, Any] | None,
    incoming_bundle: dict[str, Any] | None,
) -> dict[str, Any]:
    existing = dict(existing_bundle or {})
    incoming = dict(incoming_bundle or {})

    if not existing:
        return incoming
    if not incoming:
        return existing

    merged = {**existing, **incoming}

    existing_evidence = existing.get("evidence_bundle")
    incoming_evidence = incoming.get("evidence_bundle")
    if isinstance(existing_evidence, dict) and isinstance(incoming_evidence, dict):
        merged["evidence_bundle"] = {**existing_evidence, **incoming_evidence}

    # Preserve proof-related bundle keys when workflows send partial bundle updates.
    for key in ("proof_uploads", "proof_analysis", "proof_analysis_status"):
        if key not in incoming and key in existing:
            merged[key] = existing[key]

    if isinstance(merged.get("evidence_bundle"), dict):
        evidence = dict(merged["evidence_bundle"])
        if "proof_uploads" not in evidence and "proof_uploads" in merged:
            evidence["proof_uploads"] = merged["proof_uploads"]
        if "proof_analysis" not in evidence and "proof_analysis" in merged:
            evidence["proof_analysis"] = merged["proof_analysis"]
        if "proof_analysis_status" not in evidence and "proof_analysis_status" in merged:
            evidence["proof_analysis_status"] = merged["proof_analysis_status"]
        merged["evidence_bundle"] = evidence

    return merged


def _case_to_dict(case: Case) -> dict[str, Any]:
    return {
        "id": str(case.id),
        "reference_number": case.reference_number,
        "order_id": case.order_id,
        "dispute_type": case.dispute_type,
        "dispute_subtype": case.dispute_subtype,
        "resolution_preference": case.resolution_preference,
        "customer_name": case.customer_name,
        "customer_email": case.customer_email,
        "intake_message": case.intake_message,
        "status": case.status,
        "resolution_path": case.resolution_path,
        "assigned_to": str(case.assigned_to) if case.assigned_to else None,
        "triage_decision": case.triage_decision,
        "information_bundle": case.information_bundle,
        "resolution_plan": case.resolution_plan,
        "proof_requirements": case.proof_requirements,
        "proof_analysis": case.proof_analysis,
        "proof_analysis_status": case.proof_analysis_status,
        "invalid_reason_code": case.invalid_reason_code,
        "invalid_reason_detail": case.invalid_reason_detail,
        "appeal_priority": case.appeal_priority,
        "proof_uploads": [_proof_to_dict(upload) for upload in sorted(case.proof_uploads, key=lambda item: item.sort_order)],
        "evidence_bundle": _build_evidence_bundle(case),
        "rejection_reason": case.rejection_reason,
        "escalation_summary": case.escalation_summary,
        "last_customer_message_at": case.last_customer_message_at,
        "closed_by": case.closed_by,
        "close_reason": case.close_reason,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "closed_at": case.closed_at,
    }


async def _get_case_with_proofs(db: AsyncSession, case_id: str) -> Case | None:
    result = await db.execute(
        select(Case)
        .options(selectinload(Case.proof_uploads))
        .where(Case.id == case_id)
    )
    return result.scalar_one_or_none()


@router.post("", status_code=201, response_model=CaseCreateResponse)
async def create_case(
    payload: CaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Security(bearer_optional),
):
    if payload.dispute_type not in ("refund", "delivery"):
        raise HTTPException(status_code=422, detail="Invalid dispute_type")

    canonical_subtype = normalize_dispute_subtype(payload.dispute_subtype)
    if canonical_subtype is not None:
        if not is_known_subtype(canonical_subtype):
            raise HTTPException(status_code=422, detail="Invalid dispute_subtype")
        expected_type = subtype_expected_type(canonical_subtype)
        if expected_type != payload.dispute_type:
            raise HTTPException(status_code=422, detail="dispute_subtype is incompatible with dispute_type")

    normalized_preference = normalize_resolution_preference(payload.resolution_preference)
    if normalized_preference is not None and normalized_preference not in ALLOWED_RESOLUTION_PREFERENCES:
        raise HTTPException(status_code=422, detail="Invalid resolution_preference")

    if canonical_subtype is None and normalized_preference is not None:
        raise HTTPException(status_code=422, detail="resolution_preference requires dispute_subtype")

    effective_preference = normalized_preference
    if effective_preference is None and canonical_subtype is not None:
        effective_preference = default_preference_for(payload.dispute_type, canonical_subtype)

    if effective_preference is not None:
        allowed_preferences = allowed_preferences_for(payload.dispute_type, canonical_subtype)
        if effective_preference not in allowed_preferences:
            raise HTTPException(
                status_code=422,
                detail=f"resolution_preference '{effective_preference}' is not allowed for dispute_subtype '{canonical_subtype}'",
            )

    current_user = None
    if creds:
        try:
            current_user = await get_current_user(credentials=creds)
        except HTTPException:
            current_user = None

    if current_user and current_user.get("role") == "customer":
        if str(payload.customer_email).lower() != str(current_user.get("email") or "").lower():
            raise HTTPException(status_code=403, detail="customer_email does not match authenticated customer")

    order_q = text(
        """
        SELECT order_id, status, customer_email
        FROM sim_orders
        WHERE order_id = :order_id
        LIMIT 1
        """
    )
    order_row = (await db.execute(order_q, {"order_id": payload.order_id})).mappings().first()
    if order_row is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order_customer_email = str(order_row.get("customer_email") or "").strip().lower()
    payload_customer_email = str(payload.customer_email).strip().lower()
    if order_customer_email != payload_customer_email:
        raise HTTPException(status_code=403, detail="Order does not belong to the provided customer")

    order_status = str(order_row.get("status") or "").strip().lower()
    if order_status in {"cancelled", "canceled"}:
        raise HTTPException(status_code=409, detail="Order is cancelled and cannot be disputed.")

    dup_q = select(Case).where(and_(Case.order_id == payload.order_id, Case.status != "closed"))
    dup_res = await db.execute(dup_q)
    dup_case = dup_res.scalar_one_or_none()
    if dup_case is not None:
        raise HTTPException(status_code=409, detail="An open case already exists for this order.")

    ref = await generate_reference_number(db)

    # Determine customer_user_id from JWT if present
    customer_uid = None
    if current_user and current_user.get("role") == "customer":
        customer_uid = current_user.get("sub")

    case = Case(
        reference_number=ref,
        order_id=payload.order_id,
        dispute_type=payload.dispute_type,
        dispute_subtype=canonical_subtype,
        resolution_preference=effective_preference,
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email),
        intake_message=payload.intake_message,
        status="pending_triage",
        customer_user_id=customer_uid,
    )

    proof_requirements = requires_proof_for_case(canonical_subtype)
    case.proof_requirements = proof_requirements
    case.proof_analysis_status = "required_pending" if proof_requirements["required"] else "not_required"
    if proof_requirements["required"]:
        case.status = "awaiting_customer_proof"
    _sync_case_information_bundle(case)

    db.add(case)
    await db.commit()
    await db.refresh(case)

    # Frontend never calls n8n directly. The canonical architecture is:
    # Frontend -> FastAPI -> n8n (webhooks).
    if case.status == "pending_triage":
        await trigger_workflow(
            "/webhooks/case-created",
            {
                "case_id": str(case.id),
                "order_id": case.order_id,
                "dispute_type": case.dispute_type,
                "dispute_subtype": case.dispute_subtype,
                "resolution_preference": case.resolution_preference,
            },
        )

    return CaseCreateResponse(
        id=str(case.id),
        reference_number=case.reference_number,
        status=case.status,
        created_at=case.created_at,
    )


@router.get("/{case_id}")
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Security(bearer_optional),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if creds is None:
        return {"id": str(case.id), "reference_number": case.reference_number, "status": case.status, "updated_at": case.updated_at}

    current_user = await get_current_user(credentials=creds)
    role = current_user.get("role")
    if role == "customer":
        if case.customer_email != current_user.get("email"):
            raise HTTPException(status_code=403, detail="You do not have access to this case")
    elif role not in ("approver", "escalation"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    return _case_to_dict(case)




@router.get("/{case_id}/order-details")
async def get_case_order_details(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    """Return order data for a case — customer JWT required, must own the case."""
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")

    order_id = case.order_id

    # Fetch order
    order_q = text("SELECT order_id, status, total_amount, created_at FROM sim_orders WHERE order_id = :oid")
    order_row = (await db.execute(order_q, {"oid": order_id})).mappings().first()
    if not order_row:
        raise HTTPException(status_code=404, detail="Order not found")

    # Fetch items
    items_q = text("SELECT item_id, item_name, quantity, unit_price FROM sim_order_items WHERE order_id = :oid")
    items = [dict(i) for i in (await db.execute(items_q, {"oid": order_id})).mappings().all()]

    response: dict = {
        "order_id": order_row["order_id"],
        "status": order_row["status"],
        "total_amount": float(order_row["total_amount"]),
        "created_at": str(order_row["created_at"]),
        "items": items,
    }

    # Conditionally fetch transaction (refund disputes)
    if case.dispute_type == "refund":
        txn_q = text("SELECT status, amount, payment_method FROM sim_transactions WHERE order_id = :oid LIMIT 1")
        txn = (await db.execute(txn_q, {"oid": order_id})).mappings().first()
        if txn:
            response["transaction"] = {"status": txn["status"], "amount": float(txn["amount"]), "payment_method": txn["payment_method"]}

    # Conditionally fetch shipment (delivery disputes)
    if case.dispute_type == "delivery":
        ship_q = text("SELECT status, carrier, tracking_number, estimated_delivery FROM sim_shipments WHERE order_id = :oid LIMIT 1")
        ship = (await db.execute(ship_q, {"oid": order_id})).mappings().first()
        if ship:
            response["shipment"] = {
                "status": ship["status"],
                "carrier": ship["carrier"],
                "tracking_number": ship["tracking_number"],
                "estimated_delivery": str(ship["estimated_delivery"]),
            }

    return response


@router.get("/{case_id}/proof-uploads")
async def list_case_proof_uploads(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.get("role") == "customer" and case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.get("role") not in ("customer", "approver", "escalation"):
        raise HTTPException(status_code=403, detail="Forbidden")

    uploads = (
        await db.execute(
            select(CaseProofUpload)
            .where(CaseProofUpload.case_id == case.id)
            .order_by(CaseProofUpload.sort_order.asc(), CaseProofUpload.created_at.asc())
        )
    ).scalars().all()
    return {"uploads": [_proof_to_dict(upload) for upload in uploads]}


@router.get("/{case_id}/proof-uploads/{proof_id}")
async def get_case_proof_upload(
    case_id: str,
    proof_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if current_user.get("role") == "customer" and case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.get("role") not in ("customer", "approver", "escalation"):
        raise HTTPException(status_code=403, detail="Forbidden")

    upload_result = await db.execute(
        select(CaseProofUpload).where(
            and_(CaseProofUpload.id == proof_id, CaseProofUpload.case_id == case.id)
        )
    )
    upload = upload_result.scalar_one_or_none()
    if upload is None:
        raise HTTPException(status_code=404, detail="Proof upload not found")

    return Response(
        content=upload.image_data,
        media_type=upload.content_type,
        headers={"Content-Disposition": f'inline; filename="{upload.filename}"'},
    )


@router.post("/{case_id}/proof-uploads")
async def create_case_proof_upload(
    case_id: str,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")

    existing_uploads = (
        await db.execute(
            select(CaseProofUpload)
            .where(CaseProofUpload.case_id == case.id)
            .order_by(CaseProofUpload.sort_order.asc(), CaseProofUpload.created_at.asc())
        )
    ).scalars().all()

    if len(existing_uploads) + len(files) > MAX_PROOF_UPLOADS:
        raise HTTPException(status_code=422, detail=f"A maximum of {MAX_PROOF_UPLOADS} proof uploads is allowed per case")

    created: list[CaseProofUpload] = []
    for offset, file in enumerate(files, start=len(existing_uploads)):
        validated = await validate_proof_upload(file)
        duplicate = next((upload for upload in existing_uploads if upload.sha256 == validated.sha256), None)
        if duplicate is not None:
            raise HTTPException(status_code=409, detail=f"Duplicate proof upload detected for file '{validated.filename}'")
        upload = CaseProofUpload(
            case_id=case.id,
            filename=validated.filename,
            content_type=validated.content_type,
            byte_size=validated.byte_size,
            image_width=validated.image_width,
            image_height=validated.image_height,
            sha256=validated.sha256,
            sort_order=offset,
            image_data=validated.image_data,
        )
        db.add(upload)
        existing_uploads.append(upload)
        created.append(upload)

    await db.flush()

    ordered_items = await _load_order_items_for_proof_analysis(case, db)

    case.proof_analysis_status = "processing"
    await db.flush()

    try:
        analysis = await analyze_proof_images(
            dispute_subtype=case.dispute_subtype,
            customer_claim=case.intake_message,
            ordered_items=ordered_items,
            uploads=existing_uploads,
        )
        analysis["_debug_source"] = "cases_router_after_analyze_proof_images"
        analysis["_debug_ordered_items_count"] = len(ordered_items)
        analysis["_debug_ordered_items"] = _json_safe_debug_items(ordered_items)
        case.proof_analysis = analysis
        case.proof_analysis_status = "completed"
    except Exception as exc:  # noqa: BLE001
        case.proof_analysis_status = "failed"
        case.invalid_reason_code = "insufficient_proof"
        case.invalid_reason_detail = f"Proof analysis failed: {exc}"

    proof_required = bool((case.proof_requirements or {}).get("required"))
    advanced_to_pending_triage = proof_required and len(existing_uploads) >= 1 and case.status == "awaiting_customer_proof"
    if advanced_to_pending_triage:
        case.status = "pending_triage"

    _sync_case_information_bundle(case)
    case.updated_at = datetime.now(timezone.utc)
    if created:
        attachment_summaries = [_proof_asset_summary(upload, str(case.id)) for upload in created]
        db.add(
            ChatMessage(
                case_id=case.id,
                sender_type="customer",
                sender_id=case.customer_user_id,
                content=f"Attached {len(created)} photo{'s' if len(created) != 1 else ''} for this case.",
                metadata_={
                    "role": "proof_upload",
                    "action": "proof_uploaded",
                    "attachments": attachment_summaries,
                },
            )
        )

    await db.commit()
    for upload in created:
        await db.refresh(upload)
    if advanced_to_pending_triage:
        await trigger_workflow(
            "/webhooks/case-created",
            {
                "case_id": str(case.id),
                "order_id": case.order_id,
                "dispute_type": case.dispute_type,
                "dispute_subtype": case.dispute_subtype,
                "resolution_preference": case.resolution_preference,
            },
        )
    return {"uploads": [_proof_to_dict(upload) for upload in created], "case_status": case.status}


@router.delete("/{case_id}/proof-uploads/{proof_id}", status_code=204)
async def delete_case_proof_upload(
    case_id: str,
    proof_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if case.status != "awaiting_customer_proof":
        raise HTTPException(status_code=409, detail="Proof uploads can only be removed while awaiting customer proof")

    upload_result = await db.execute(
        select(CaseProofUpload).where(
            and_(CaseProofUpload.id == proof_id, CaseProofUpload.case_id == case.id)
        )
    )
    upload = upload_result.scalar_one_or_none()
    if upload is None:
        raise HTTPException(status_code=404, detail="Proof upload not found")

    await db.execute(delete(CaseProofUpload).where(CaseProofUpload.id == upload.id))
    case.proof_uploads = [item for item in case.proof_uploads if item.id != upload.id]
    case.proof_analysis = None
    case.proof_analysis_status = "required_pending"
    _sync_case_information_bundle(case)
    case.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return Response(status_code=204)


class CasePatchRequest(BaseModel):
    status: str | None = None
    resolution_path: str | None = None
    assigned_to: str | None = None
    triage_decision: dict[str, Any] | None = None
    information_bundle: dict[str, Any] | None = None
    resolution_plan: dict[str, Any] | None = None
    proof_requirements: dict[str, Any] | None = None
    proof_analysis: dict[str, Any] | None = None
    proof_analysis_status: str | None = None
    invalid_reason_code: str | None = None
    invalid_reason_detail: str | None = None
    appeal_priority: str | None = None
    rejection_reason: str | None = None
    escalation_summary: str | None = None
    last_customer_message_at: datetime | None = None
    closed_by: str | None = None
    close_reason: str | None = None
    closed_at: datetime | None = None


@router.patch("/{case_id}")
async def patch_case(
    case_id: str,
    payload: CasePatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status == "closed":
        raise HTTPException(status_code=422, detail="Case is closed")

    prev_status = case.status
    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] is not None:
        next_status = data["status"]
        if not validate_status_transition(case.status, next_status):
            raise HTTPException(status_code=422, detail="Invalid status transition")

    if "information_bundle" in data and data["information_bundle"] is not None:
        data["information_bundle"] = _merge_information_bundle(
            case.information_bundle,
            data["information_bundle"],
        )

    for field, value in data.items():
        if field == "assigned_to" and value is not None:
            try:
                setattr(case, field, uuid.UUID(value))
            except Exception as exc:
                raise HTTPException(status_code=422, detail="Invalid assigned_to") from exc
        else:
            setattr(case, field, value)

    proof_related_fields = {
        "proof_requirements",
        "proof_analysis",
        "proof_analysis_status",
        "invalid_reason_code",
        "invalid_reason_detail",
        "appeal_priority",
    }
    if proof_related_fields.intersection(data.keys()):
        _sync_case_information_bundle(case)

    case.updated_at = datetime.now(timezone.utc)

    # Auto-create a pending refund_request when workflows move a refund case into awaiting_approval.
    # This ensures customers are notified immediately with a Refund Request ID, even if the workflow only
    # patches the case record and does not call /refund_requests.
    #
    # Use a nested transaction so bookkeeping failures cannot poison the outer session and
    # turn an otherwise-valid case PATCH into a 500.
    try:
        async with db.begin_nested():
            plan = case.resolution_plan or {}
            resolution_type = None
            if isinstance(plan, dict):
                resolution_type = plan.get("resolution_type")
            resolved_type = str(resolution_type or case.resolution_preference or "refund").strip().lower()

            if (
                prev_status != "awaiting_approval"
                and case.status == "awaiting_approval"
                and case.dispute_type == "refund"
                and resolved_type == "refund"
            ):
                existing_rr = await db.execute(
                    select(RefundRequest.id)
                    .where(RefundRequest.case_id == case.id)
                    .where(RefundRequest.status != "failed")
                    .limit(1)
                )
                if existing_rr.scalar_one_or_none() is None:
                    raw_amount = None
                    if isinstance(plan, dict):
                        raw_amount = plan.get("amount")
                    if raw_amount is None:
                        bundle = case.information_bundle or {}
                        txn = bundle.get("transaction") if isinstance(bundle, dict) else None
                        if isinstance(txn, dict):
                            raw_amount = txn.get("amount")

                    amount = float(raw_amount) if raw_amount is not None else 0.0

                    reason = f"Workflow plan: {resolved_type or 'refund'}"

                    rr = RefundRequest(
                        case_id=case.id,
                        order_id=case.order_id,
                        amount=amount,
                        reason=reason,
                        status="pending",
                    )
                    db.add(rr)
                    await db.flush()  # populate rr.id

                    msg = (
                        f"A refund request has been created for your case (Refund Request ID: {rr.id}, Amount: THB {amount:.2f}). "
                        "Please wait while it is reviewed for approval."
                    )
                    db.add(
                        ChatMessage(
                            case_id=case.id,
                            sender_type="system",
                            sender_id=None,
                            content=msg,
                            metadata_=None,
                        )
                    )
    except Exception:
        # Never fail workflow patch calls due to notification bookkeeping.
        pass

    try:
        await db.commit()
        await db.refresh(case)

        case = await _get_case_with_proofs(db, case_id)
        assert case is not None
        return _case_to_dict(case)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"patch_case_failed: {type(exc).__name__}: {exc}") from exc


@router.post("/{case_id}/approve", response_model=CaseApproveResponse)
async def approve_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Case not awaiting approval")

    case.status = "approved_executing"
    case.updated_at = datetime.now(timezone.utc)

    await db.commit()

    # Frontend never calls n8n directly. The canonical architecture is:
    # Frontend -> FastAPI -> n8n (webhooks).
    await trigger_workflow("/webhooks/approved", {"case_id": str(case.id)})

    return CaseApproveResponse(status=case.status, message="Approval recorded. Execution started.")


@router.post("/{case_id}/claim")
async def claim_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_escalation),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status == "closed":
        raise HTTPException(status_code=409, detail="Case is closed")

    agent_sub = current_user.get("sub")
    if not isinstance(agent_sub, str):
        raise HTTPException(status_code=401, detail="Invalid token subject")

    try:
        agent_uuid = uuid.UUID(agent_sub)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Invalid user id in token") from exc

    if case.assigned_to is not None and case.assigned_to != agent_uuid:
        raise HTTPException(
            status_code=409,
            detail="This case is already claimed and handled by another agent.",
        )

    if case.status != "escalated_human_required" and case.assigned_to != agent_uuid:
        raise HTTPException(status_code=409, detail="Case is not available for claim")

    newly_claimed = case.assigned_to is None
    case.assigned_to = agent_uuid
    case.updated_at = datetime.now(timezone.utc)

    if newly_claimed:
        agent_name = str(current_user.get("full_name") or "Agent").strip() or "Agent"
        db.add(
            ChatMessage(
                case_id=case.id,
                sender_type="system",
                sender_id=None,
                content=f"Agent {agent_name} has joined the conversation",
                metadata_=None,
            )
        )

    await db.commit()
    await db.refresh(case)

    case = await _get_case_with_proofs(db, case_id)
    assert case is not None
    return _case_to_dict(case)


@router.post("/{case_id}/reject")
async def reject_case(
    case_id: str,
    payload: CaseRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail="Case not awaiting approval")

    if payload.policy_refs:
        res = await db.execute(select(Policy.slug).where(Policy.slug.in_(payload.policy_refs)))
        found = {row[0] for row in res.all()}
        missing = [s for s in payload.policy_refs if s not in found]
        if missing:
            raise HTTPException(status_code=422, detail=f"Invalid policy slug(s): {', '.join(missing)}")

    case.rejection_reason = payload.reason
    case.status = "rejected_human_required"
    case.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(case)

    return {"status": case.status}


@router.post("/{case_id}/invalidate")
async def invalidate_case(
    case_id: str,
    payload: CaseInvalidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    if payload.invalid_reason_code not in INVALID_REASON_CODES:
        raise HTTPException(status_code=422, detail="Invalid invalid_reason_code")

    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if not validate_status_transition(case.status, "awaiting_customer_decision"):
        raise HTTPException(status_code=422, detail="Invalid status transition")

    case.status = "awaiting_customer_decision"
    case.invalid_reason_code = payload.invalid_reason_code
    case.invalid_reason_detail = payload.invalid_reason_detail
    case.appeal_priority = get_appeal_priority(payload.invalid_reason_code)
    _sync_case_information_bundle(case)
    case.updated_at = datetime.now(timezone.utc)

    message = payload.message or get_customer_invalid_reason_message(
        payload.invalid_reason_code,
        payload.invalid_reason_detail,
    )
    db.add(
        ChatMessage(
            case_id=case.id,
            sender_type="system",
            sender_id=None,
            content=message,
            metadata_={
                "role": "invalid_case_notice",
                "invalid_reason_code": payload.invalid_reason_code,
                "appeal_priority": case.appeal_priority,
            },
        )
    )

    await db.commit()
    await db.refresh(case)
    case = await _get_case_with_proofs(db, case_id)
    assert case is not None
    return _case_to_dict(case)


@router.post("/{case_id}/appeal")
async def appeal_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.customer_email != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if case.status != "awaiting_customer_decision":
        raise HTTPException(status_code=409, detail="Case is not awaiting a customer decision")

    case.status = "escalated_human_required"
    case.appeal_priority = get_appeal_priority(case.invalid_reason_code)
    _sync_case_information_bundle(case)
    case.updated_at = datetime.now(timezone.utc)
    db.add(
        ChatMessage(
            case_id=case.id,
            sender_type="customer",
            sender_id=None,
            content="I want to appeal this decision and have a human review my case.",
            metadata_={
                "action": "appeal_requested",
                "invalid_reason_code": case.invalid_reason_code,
                "appeal_priority": case.appeal_priority,
            },
        )
    )

    await db.commit()
    await db.refresh(case)
    await trigger_workflow("/webhooks/triage-escalation", {"case_id": str(case.id)})
    case = await _get_case_with_proofs(db, case_id)
    assert case is not None
    return _case_to_dict(case)




class CaseCloseRequest(BaseModel):
    closed_by: str
    close_reason: str | None = None


@router.post("/{case_id}/close")
async def close_case(
    case_id: str,
    payload: CaseCloseRequest,
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Security(bearer_optional),
):
    # auth rules: customer close is public; agent close requires JWT
    if payload.closed_by not in ("customer", "agent", "timeout"):
        raise HTTPException(status_code=422, detail="Invalid closed_by")

    if payload.closed_by == "agent":
        if creds is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
        _ = await get_current_user(credentials=creds)
        if payload.close_reason not in ("resolved", "unresponsive", "duplicate"):
            raise HTTPException(status_code=422, detail="Invalid close_reason")
    elif payload.closed_by == "customer":
        if payload.close_reason is not None:
            raise HTTPException(status_code=422, detail="Customer close_reason must be null")
    elif payload.closed_by == "timeout":
        if payload.close_reason != "unresponsive":
            raise HTTPException(status_code=422, detail="Timeout close_reason must be 'unresponsive'")

    case = await _get_case_with_proofs(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status == "closed":
        raise HTTPException(status_code=409, detail="Case already closed")

    if not validate_status_transition(case.status, "closed"):
        raise HTTPException(status_code=422, detail="Invalid status transition")

    case.status = "closed"
    case.closed_by = payload.closed_by
    case.close_reason = payload.close_reason
    case.closed_at = datetime.now(timezone.utc)
    case.updated_at = datetime.now(timezone.utc)

    await db.commit()

    # system message
    await db.execute(
        text(
            """
            INSERT INTO chat_messages (id, case_id, sender_type, sender_id, content, metadata, created_at)
            VALUES (gen_random_uuid(), :case_id, 'system', NULL, 'This conversation has been closed.', NULL, NOW())
            """
        ),
        {"case_id": case.id},
    )
    await db.commit()

    # Frontend never calls n8n directly. The canonical architecture is:
    # Frontend -> FastAPI -> n8n (webhooks).
    await trigger_workflow(
        "/webhooks/conversation-closed",
        {"case_id": str(case.id), "closed_by": payload.closed_by, "close_reason": payload.close_reason},
    )

    return {"status": "closed"}

@router.get("", response_model=CaseListResponse)
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    dispute_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    filters = []
    if status_filter:
        filters.append(Case.status == status_filter)
    if dispute_type:
        filters.append(Case.dispute_type == dispute_type)
    if search:
        like = f"%{search}%"
        filters.append(or_(Case.order_id.ilike(like), Case.customer_name.ilike(like), Case.reference_number.ilike(like)))

    where_clause = and_(*filters) if filters else None

    total_q = select(func.count()).select_from(Case)
    if where_clause is not None:
        total_q = total_q.where(where_clause)

    total = int((await db.execute(total_q)).scalar_one())

    q = select(Case).options(selectinload(Case.proof_uploads)).order_by(Case.created_at.desc()).limit(limit).offset(offset)
    if where_clause is not None:
        q = q.where(where_clause)

    res = await db.execute(q)
    cases = res.scalars().all()

    return {"cases": [_case_to_dict(c) for c in cases], "total": total}








