"""Refund and return record creation routes for WF5."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_agent, require_escalation, require_approver
from api.db.database import get_db
from api.db.models import Case, ChatMessage, Policy, RefundRequest
from api.services.escalation_messages import TEMPLATES, post_message

router = APIRouter(tags=["resolution-records"])

ESCALATION_HUMAN_STATUSES = ("escalated_human_required", "rejected_human_required")


def _format_thb(amount: float) -> str:
    # Keep ASCII-only to avoid editor/encoding issues on Windows.
    return f"{amount:.2f}"


def _timeline_for_payment_method(payment_method: str | None) -> str:
    """Derived from POL-006 (payment-refund-timeline)."""
    pm = (payment_method or "").strip().lower()
    if pm == "credit_card":
        return "3-5 business days"
    if pm in ("promptpay_bank_transfer", "promptpay", "bank_transfer"):
        return "1-2 business days"
    if pm in ("digital_wallet", "truemoney", "rabbit_line_pay", "wallet"):
        return "1-3 business days"
    if pm == "cod":
        return "1 business day (store credit; cash refunds are not supported for COD orders)"
    return "3-5 business days"


def _get_bundle_payment_method(case: Case) -> str | None:
    bundle = case.information_bundle or {}
    txn = bundle.get("transaction") or None
    if isinstance(txn, dict) and txn.get("payment_method"):
        try:
            return str(txn["payment_method"])
        except Exception:
            return None
    return None


def _payment_method_query(case: Case) -> tuple[str, dict]:
    # Mirror the simulated-source lookup used elsewhere in the API.
    return (
        "SELECT payment_method FROM sim_transactions WHERE order_id = :oid LIMIT 1",
        {"oid": case.order_id},
    )


class RefundRequestCreate(BaseModel):
    case_id: str
    order_id: str = Field(min_length=1, max_length=50)
    amount: float = Field(ge=0)
    reason: str = Field(min_length=1)
    status: str = "pending"


class RefundRequestListResponse(BaseModel):
    refund_requests: list[dict]

class DenyRefundRequest(BaseModel):
    reason: str = Field(min_length=10)
    policy_slug: str | None = None


class DuplicateRefundResponse(BaseModel):
    status: str = "ok"


class RefundApprovalQueueItem(BaseModel):
    id: str
    case_id: str
    case_reference_number: str
    case_status: str
    order_id: str
    amount: float
    reason: str
    status: str
    created_at: datetime


class RefundApprovalQueueResponse(BaseModel):
    refund_requests: list[RefundApprovalQueueItem]


class RefundApproveResponse(BaseModel):
    status: str = "processed"


def _serialize_record(record: RefundRequest) -> dict:
    return {
        "id": str(record.id),
        "case_id": str(record.case_id),
        "order_id": record.order_id,
        "created_at": record.created_at,
        "status": record.status,
    }


async def _get_case(case_id: str, db: AsyncSession) -> Case:
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid case_id") from exc

    result = await db.execute(select(Case).where(Case.id == case_uuid))
    case = result.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("/refund_requests", response_model=RefundApprovalQueueResponse)
async def list_all_refund_requests(
    status: str = Query(default="pending"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    _ = current_user
    if status not in ("pending", "processed", "failed"):
        raise HTTPException(status_code=422, detail="Invalid refund request status")

    q = (
        select(RefundRequest, Case)
        .join(Case, Case.id == RefundRequest.case_id)
        .where(RefundRequest.status == status)
        .order_by(RefundRequest.created_at.desc())
    )
    res = await db.execute(q)

    items: list[RefundApprovalQueueItem] = []
    for rr, case in res.all():
        items.append(
            RefundApprovalQueueItem(
                id=str(rr.id),
                case_id=str(case.id),
                case_reference_number=case.reference_number,
                case_status=case.status,
                order_id=rr.order_id,
                amount=float(rr.amount),
                reason=rr.reason,
                status=rr.status,
                created_at=rr.created_at,
            )
        )

    return RefundApprovalQueueResponse(refund_requests=items)


@router.post("/refund_requests/{refund_request_id}/approve", response_model=RefundApproveResponse)
async def approve_refund_request(
    refund_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    _ = current_user
    try:
        rr_uuid = uuid.UUID(refund_request_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid refund_request_id") from exc

    rr_res = await db.execute(select(RefundRequest).where(RefundRequest.id == rr_uuid))
    rr = rr_res.scalar_one_or_none()
    if rr is None:
        raise HTTPException(status_code=404, detail="Refund request not found")
    if rr.status != "pending":
        raise HTTPException(status_code=409, detail="Refund request is not pending")

    case_res = await db.execute(select(Case).where(Case.id == rr.case_id))
    case = case_res.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    rr.status = "processed"
    case.status = "resolved"
    case.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(rr)

    pm = _get_bundle_payment_method(case)
    if pm is None:
        q, params = _payment_method_query(case)
        row = (await db.execute(text(q), params)).mappings().first()
        pm = row.get("payment_method") if row else None

    timeline = _timeline_for_payment_method(pm)
    msg = f"Refund request #{rr.id} has been approved. Please expect your refund within {timeline}."
    await post_message(db, case.id, msg, sender_type="system")

    return RefundApproveResponse()


@router.get("/cases/{case_id}/refund_requests", response_model=RefundRequestListResponse)
async def list_refund_requests(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    case = await _get_case(case_id, db)
    agent_sub = current_user.get("sub")
    if current_user.get("role") == "escalation" and case.assigned_to is not None and agent_sub:
        # Escalation agents can only view refund records for cases they currently own.
        if case.assigned_to != uuid.UUID(agent_sub):
            raise HTTPException(status_code=403, detail="This case is handled by another agent")

    res = await db.execute(select(RefundRequest).where(RefundRequest.case_id == case.id).order_by(RefundRequest.created_at.desc()))
    records = res.scalars().all()
    return {
        "refund_requests": [
            {
                **_serialize_record(r),
                "amount": float(r.amount),
                "reason": r.reason,
            }
            for r in records
        ]
    }


@router.post("/refund_requests", status_code=status.HTTP_201_CREATED)
async def create_refund_request(
    payload: RefundRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user
    case = await _get_case(payload.case_id, db)

    if payload.status not in ("pending", "processed", "failed"):
        raise HTTPException(status_code=422, detail="Invalid refund request status")
    if case.order_id != payload.order_id:
        raise HTTPException(status_code=422, detail="order_id does not match case")

    # Duplicate handling for workflow retries / multi-step flows:
    # if a non-failed refund already exists for this case+order, treat this call as idempotent
    # instead of failing hard.
    dup_q = select(RefundRequest).where(
        and_(
            RefundRequest.case_id == case.id,
            RefundRequest.order_id == payload.order_id,
            RefundRequest.status != "failed",
        )
    )
    dup_res = await db.execute(dup_q.limit(1))
    existing = dup_res.scalar_one_or_none()
    if existing is not None:
        changed = False
        if payload.status in ("pending", "processed") and existing.status != payload.status:
            existing.status = payload.status
            changed = True
        if float(existing.amount) != float(payload.amount):
            existing.amount = payload.amount
            changed = True
        if payload.reason.strip() and existing.reason != payload.reason:
            existing.reason = payload.reason
            changed = True

        if changed:
            await db.commit()
            await db.refresh(existing)

        # Ensure the customer sees a "request created / awaiting approval" message at least once.
        if existing.status == "pending":
            msg_check = await db.execute(
                select(ChatMessage.id)
                .where(ChatMessage.case_id == case.id)
                .where(ChatMessage.content.ilike(f"%{existing.id}%"))
                .limit(1)
            )
            if msg_check.scalar_one_or_none() is None:
                amount_str = _format_thb(float(existing.amount))
                msg = (
                    f"A refund request has been created for your case (Refund Request ID: {existing.id}, Amount: THB {amount_str}). "
                    "Please wait while it is reviewed for approval."
                )
                await post_message(db, case.id, msg, sender_type="system")

        return {
            **_serialize_record(existing),
            "amount": float(existing.amount),
            "reason": existing.reason,
        }

    refund_request = RefundRequest(
        case_id=case.id,
        order_id=payload.order_id,
        amount=payload.amount,
        reason=payload.reason,
        status=payload.status,
    )
    db.add(refund_request)
    await db.commit()
    await db.refresh(refund_request)

    # Determine whether to label the customer message as "partial" vs "full".
    txn_amount: float | None = None
    try:
        bundle = case.information_bundle or {}
        txn = bundle.get("transaction") or None
        if txn and "amount" in txn:
            txn_amount = float(txn["amount"])
    except Exception:
        txn_amount = None
    amount_str = _format_thb(float(payload.amount))
    is_partial = txn_amount is not None and float(payload.amount) < txn_amount


    is_pending = refund_request.status == "pending"

    if is_pending:
        kind = "Partial refund request" if is_partial else "Refund request"
        msg = (
            f"{kind} has been created for your case (Refund Request ID: {refund_request.id}, Amount: THB {amount_str}). "
            "Please wait while it is reviewed for approval."
        )
    else:
        if is_partial:
            msg = f"Partial refund request #{refund_request.id} has been created for THB {amount_str}."
        else:
            msg = (
                f"Refund request #{refund_request.id} has been created for THB {amount_str}. "
                "Refund timing depends on your original payment method."
            )

    await post_message(db, case.id, msg, sender_type="system")

    return {
        **_serialize_record(refund_request),
        "amount": float(refund_request.amount),
        "reason": refund_request.reason,
    }


@router.post("/cases/{case_id}/deny-refund")
async def deny_refund(
    case_id: str,
    payload: DenyRefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_escalation),
):
    case_uuid = uuid.UUID(case_id)
    case = await _get_case(case_id, db)

    agent_uuid = uuid.UUID(current_user["sub"])
    if case.assigned_to is None or case.assigned_to != agent_uuid:
        raise HTTPException(status_code=403, detail="This case is not assigned to you")

    if payload.policy_slug:
        res = await db.execute(select(Policy.slug).where(Policy.slug == payload.policy_slug))
        if res.scalar_one_or_none() is None:
            raise HTTPException(status_code=422, detail="Invalid policy slug")

    # future: persist structured denial marker (e.g., case.rejection_reason) for reporting so outcomes can be queried without parsing chat history
    await post_message(
        db,
        case.id,
        TEMPLATES["refund_denied"].format(reason=payload.reason),
        sender_type="agent",
        sender_id=agent_uuid,
    )
    return {"status": "ok"}


@router.post("/cases/{case_id}/mark-duplicate-refund", response_model=DuplicateRefundResponse)
async def mark_duplicate_refund(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_escalation),
):
    case = await _get_case(case_id, db)
    agent_uuid = uuid.UUID(current_user["sub"])

    if case.assigned_to is None or case.assigned_to != agent_uuid:
        raise HTTPException(status_code=403, detail="This case is not assigned to you")

    # future: persist duplicate marker on case record for reporting so duplicate outcomes can be queried without parsing chat history
    await post_message(db, case.id, TEMPLATES["duplicate_refund"], sender_type="system")
    return {"status": "ok"}


