"""Case CRUD and approval routes."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import get_current_user, get_current_user_optional, require_agent, require_approver, require_customer, require_escalation
from api.db.database import get_db
from api.db.models import Case, ChatMessage, Policy, RefundRequest
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
        "rejection_reason": case.rejection_reason,
        "escalation_summary": case.escalation_summary,
        "last_customer_message_at": case.last_customer_message_at,
        "closed_by": case.closed_by,
        "close_reason": case.close_reason,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "closed_at": case.closed_at,
    }


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
    db.add(case)
    await db.commit()
    await db.refresh(case)

    # Frontend never calls n8n directly. The canonical architecture is:
    # Frontend -> FastAPI -> n8n (webhooks).
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
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    if creds is None:
        return {"id": str(case.id), "reference_number": case.reference_number, "status": case.status}

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
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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


class CasePatchRequest(BaseModel):
    status: str | None = None
    resolution_path: str | None = None
    assigned_to: str | None = None
    triage_decision: dict[str, Any] | None = None
    information_bundle: dict[str, Any] | None = None
    resolution_plan: dict[str, Any] | None = None
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
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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
        if case.information_bundle is not None:
            raise HTTPException(status_code=422, detail="information_bundle is immutable after initial set")

    for field, value in data.items():
        if field == "assigned_to" and value is not None:
            try:
                setattr(case, field, uuid.UUID(value))
            except Exception as exc:
                raise HTTPException(status_code=422, detail="Invalid assigned_to") from exc
        else:
            setattr(case, field, value)

    case.updated_at = datetime.now(timezone.utc)

    # Auto-create a pending refund_request when workflows move a refund case into awaiting_approval.
    # This ensures customers are notified immediately with a Refund Request ID, even if the workflow only
    # patches the case record and does not call /refund_requests.
    try:
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

    await db.commit()
    await db.refresh(case)

    return _case_to_dict(case)


@router.post("/{case_id}/approve", response_model=CaseApproveResponse)
async def approve_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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

    return _case_to_dict(case)


@router.post("/{case_id}/reject")
async def reject_case(
    case_id: str,
    payload: CaseRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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

    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
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

    q = select(Case).order_by(Case.created_at.desc()).limit(limit).offset(offset)
    if where_clause is not None:
        q = q.where(where_clause)

    res = await db.execute(q)
    cases = res.scalars().all()

    return {"cases": [_case_to_dict(c) for c in cases], "total": total}








