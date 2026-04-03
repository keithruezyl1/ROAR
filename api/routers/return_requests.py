"""Return request routes (split out from resolution_records)."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_agent, require_approver
from api.db.database import get_db
from api.db.models import Case, ChatMessage, ReturnRequest
from api.services.escalation_messages import TEMPLATES, post_message

router = APIRouter(tags=["return-requests"])


class ReturnRequestCreate(BaseModel):
    case_id: str
    order_id: str = Field(min_length=1, max_length=50)
    item_ids: list[str] = Field(default_factory=list)
    return_reason: str = Field(min_length=1)
    status: str = "pending"


class ReturnRequestListResponse(BaseModel):
    return_requests: list[dict]


class ReturnApprovalQueueItem(BaseModel):
    id: str
    case_id: str
    case_reference_number: str
    case_status: str
    order_id: str
    item_ids: list[str]
    return_reason: str
    status: str
    created_at: datetime


class ReturnApprovalQueueResponse(BaseModel):
    return_requests: list[ReturnApprovalQueueItem]


class ReturnStatusUpdateRequest(BaseModel):
    status: str
    reason: str | None = None


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


def _serialize_record(record: ReturnRequest) -> dict:
    return {
        "id": str(record.id),
        "case_id": str(record.case_id),
        "order_id": record.order_id,
        "created_at": record.created_at,
        "status": record.status,
        "item_ids": record.item_ids,
        "return_reason": record.return_reason,
    }


@router.get("/return_requests", response_model=ReturnApprovalQueueResponse)
async def list_all_return_requests(
    status: str = Query(default="pending"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver),
):
    _ = current_user
    if status not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=422, detail="Invalid return request status")

    query = (
        select(ReturnRequest, Case)
        .join(Case, Case.id == ReturnRequest.case_id)
        .where(ReturnRequest.status == status)
        .order_by(ReturnRequest.created_at.desc())
    )
    rows = (await db.execute(query)).all()

    return {
        "return_requests": [
            ReturnApprovalQueueItem(
                id=str(rr.id),
                case_id=str(case.id),
                case_reference_number=case.reference_number,
                case_status=case.status,
                order_id=rr.order_id,
                item_ids=rr.item_ids,
                return_reason=rr.return_reason,
                status=rr.status,
                created_at=rr.created_at,
            )
            for rr, case in rows
        ]
    }


@router.get("/cases/{case_id}/return_requests", response_model=ReturnRequestListResponse)
async def list_return_requests(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    case = await _get_case(case_id, db)
    agent_sub = current_user.get("sub")
    if current_user.get("role") == "escalation" and case.assigned_to is not None and agent_sub:
        if case.assigned_to != uuid.UUID(agent_sub):
            raise HTTPException(status_code=403, detail="This case is handled by another agent")

    res = await db.execute(select(ReturnRequest).where(ReturnRequest.case_id == case.id).order_by(ReturnRequest.created_at.desc()))
    records = res.scalars().all()
    return {"return_requests": [_serialize_record(r) for r in records]}


@router.post("/return_requests", status_code=status.HTTP_201_CREATED)
async def create_return_request(
    payload: ReturnRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user
    case = await _get_case(payload.case_id, db)

    if payload.status not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=422, detail="Invalid return request status")
    if case.order_id != payload.order_id:
        raise HTTPException(status_code=422, detail="order_id does not match case")

    # Idempotent-ish behavior: if a non-failed record exists, return it.
    dup_q = select(ReturnRequest).where(
        and_(
            ReturnRequest.case_id == case.id,
            ReturnRequest.order_id == payload.order_id,
        )
    )
    dup_res = await db.execute(dup_q.order_by(ReturnRequest.created_at.desc()).limit(1))
    existing = dup_res.scalar_one_or_none()
    if existing is not None and existing.status != "rejected":
        return _serialize_record(existing)

    rr = ReturnRequest(
        case_id=case.id,
        order_id=payload.order_id,
        item_ids=payload.item_ids,
        return_reason=payload.return_reason,
        status=payload.status,
    )
    db.add(rr)
    await db.commit()
    await db.refresh(rr)

    await post_message(db, case.id, TEMPLATES["return_created"], sender_type="system")

    return _serialize_record(rr)


@router.patch("/return_requests/{return_request_id}")
async def update_return_request_status(
    return_request_id: str,
    payload: ReturnStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    try:
        return_uuid = uuid.UUID(return_request_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid return_request_id") from exc

    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Invalid return request status")
    if payload.status == "rejected" and (payload.reason is None or payload.reason.strip() == ""):
        raise HTTPException(status_code=422, detail="Rejection reason is required")

    res = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_uuid))
    rr = res.scalar_one_or_none()
    if rr is None:
        raise HTTPException(status_code=404, detail="Return request not found")

    case = await _get_case(str(rr.case_id), db)
    if current_user.get("role") == "escalation":
        agent_uuid = uuid.UUID(current_user["sub"])
        if case.assigned_to is None or case.assigned_to != agent_uuid:
            raise HTTPException(status_code=403, detail="This case is not assigned to you")

    if rr.status != "pending":
        raise HTTPException(status_code=409, detail="Return request is not in pending status")

    rr.status = payload.status
    await db.commit()
    await db.refresh(rr)

    if payload.status == "approved":
        await post_message(db, case.id, TEMPLATES["return_approved"], sender_type="system")
    else:
        await post_message(
            db,
            case.id,
            TEMPLATES["return_rejected"].format(reason=payload.reason or ""),
            sender_type="system",
        )

    return _serialize_record(rr)
