"""Refund and return record creation routes for WF5."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_agent
from api.db.database import get_db
from api.db.models import Case, RefundRequest, ReturnRequest

router = APIRouter(tags=["resolution-records"])


class RefundRequestCreate(BaseModel):
    case_id: str
    order_id: str = Field(min_length=1, max_length=50)
    amount: float = Field(ge=0)
    reason: str = Field(min_length=1)
    status: str = "pending"


class ReturnRequestCreate(BaseModel):
    case_id: str
    order_id: str = Field(min_length=1, max_length=50)
    item_ids: list[str] = Field(default_factory=list)
    return_reason: str = Field(min_length=1)
    status: str = "pending"


def _serialize_record(record: RefundRequest | ReturnRequest) -> dict:
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

    return {
        **_serialize_record(refund_request),
        "amount": float(refund_request.amount),
        "reason": refund_request.reason,
    }


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

    return_request = ReturnRequest(
        case_id=case.id,
        order_id=payload.order_id,
        item_ids=payload.item_ids,
        return_reason=payload.return_reason,
        status=payload.status,
    )
    db.add(return_request)
    await db.commit()
    await db.refresh(return_request)

    return {
        **_serialize_record(return_request),
        "item_ids": return_request.item_ids,
        "return_reason": return_request.return_reason,
    }
