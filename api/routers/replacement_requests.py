"""Replacement request routes for autonomous/approved replacement execution."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_agent
from api.db.database import get_db
from api.db.models import Case, ChatMessage, ReplacementRequest
from api.services.affected_items import (
    affected_item_ids_from_messages,
    fallback_match_item_ids_from_text,
    filter_order_items_to_affected,
)
from api.services.escalation_messages import post_message

router = APIRouter(tags=["replacement-requests"])

TERMINAL_STATUSES = {"cancelled", "rejected", "completed"}
ACTIVE_STATUSES = {"pending", "approved", "executing"}

VALID_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"approved", "rejected", "cancelled"},
    "approved": {"executing", "cancelled"},
    "executing": {"completed", "cancelled"},
    "rejected": set(),
    "cancelled": set(),
    "completed": set(),
}


class ReplacementItem(BaseModel):
    item_id: str | None = None
    sku: str | None = None
    quantity: int | None = Field(default=None, ge=1)
    quantity_ordered: int | None = Field(default=None, ge=1)
    product_name: str | None = None
    item_name: str | None = None
    warehouse_location: str | None = None
    quantity_available_now: int | None = None
    unit_price: float | None = None
    order_id: str | None = None

    @model_validator(mode="after")
    def ensure_item_identifier(self) -> "ReplacementItem":
        if not self.item_id and not self.sku:
            raise ValueError("replacement item requires item_id or sku")
        if self.quantity is None and self.quantity_ordered is None:
            raise ValueError("replacement item requires quantity or quantity_ordered")
        if self.quantity is None and self.quantity_ordered is not None:
            self.quantity = self.quantity_ordered
        if self.quantity_ordered is None and self.quantity is not None:
            self.quantity_ordered = self.quantity
        if self.product_name is None and self.item_name is not None:
            self.product_name = self.item_name
        return self


class ReplacementRequestCreate(BaseModel):
    case_id: str
    order_id: str = Field(min_length=1, max_length=50)
    reason: str = Field(min_length=1)
    replacement_items: list[ReplacementItem] = Field(min_length=1)
    eligible_amount: float | None = Field(default=None, ge=0)
    metadata: dict[str, Any] | None = None
    status: str = "pending"


class ReplacementRequestPatch(BaseModel):
    status: str
    reason: str | None = None
    metadata: dict[str, Any] | None = None


class ReplacementRequestListResponse(BaseModel):
    replacement_requests: list[dict[str, Any]]


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


def _serialize(record: ReplacementRequest) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "case_id": str(record.case_id),
        "order_id": record.order_id,
        "status": record.status,
        "requested_at": record.requested_at,
        "approved_at": record.approved_at,
        "executed_at": record.executed_at,
        "closed_at": record.closed_at,
        "reason": record.reason,
        "replacement_items": record.replacement_items,
        "eligible_amount": float(record.eligible_amount) if record.eligible_amount is not None else None,
        "metadata": record.metadata_,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def _eligible_amount_for_items(items: list[ReplacementItem], fallback: float | None) -> Decimal | None:
    computed = 0.0
    has_pricing = False
    for item in items:
        if item.unit_price is None:
            continue
        quantity = item.quantity or item.quantity_ordered or 0
        computed += float(item.unit_price) * float(quantity)
        has_pricing = True

    if has_pricing:
        return Decimal(str(round(computed, 2)))
    if fallback is None:
        return None
    return Decimal(str(fallback))


async def _resolve_replacement_items_subset(
    case: Case,
    payload: ReplacementRequestCreate,
    db: AsyncSession,
) -> list[ReplacementItem]:
    message_rows = (
        await db.execute(
            select(ChatMessage)
            .where(ChatMessage.case_id == case.id)
            .order_by(ChatMessage.created_at.asc())
        )
    ).scalars().all()

    affected_item_ids = affected_item_ids_from_messages(message_rows)

    if not affected_item_ids:
        bundle = case.information_bundle or {}
        order_items = []
        if isinstance(bundle, dict):
            raw_items = bundle.get("order_items_detail") or bundle.get("order_items") or []
            if isinstance(raw_items, list):
                order_items = [item for item in raw_items if isinstance(item, dict)]

        for message in reversed(message_rows):
            if message.sender_type != "customer":
                continue
            matched_ids = fallback_match_item_ids_from_text(order_items, message.content)
            if matched_ids:
                affected_item_ids = matched_ids
                break

    if not affected_item_ids:
        return payload.replacement_items

    payload_items = [item.model_dump() for item in payload.replacement_items]
    filtered_items = filter_order_items_to_affected(payload_items, affected_item_ids)

    return [ReplacementItem.model_validate(item) for item in filtered_items]


@router.post("/replacement-requests", status_code=status.HTTP_201_CREATED)
async def create_replacement_request(
    payload: ReplacementRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user

    if payload.status not in ACTIVE_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid replacement request status")

    case = await _get_case(payload.case_id, db)

    if case.order_id != payload.order_id:
        raise HTTPException(status_code=422, detail="order_id does not match case")

    existing_q = (
        select(ReplacementRequest)
        .where(
            and_(
                ReplacementRequest.case_id == case.id,
                ReplacementRequest.order_id == payload.order_id,
            )
        )
        .order_by(ReplacementRequest.created_at.desc())
        .limit(1)
    )
    existing = (await db.execute(existing_q)).scalar_one_or_none()
    if existing is not None and existing.status not in TERMINAL_STATUSES:
        return _serialize(existing)

    resolved_items = await _resolve_replacement_items_subset(case, payload, db)

    req = ReplacementRequest(
        case_id=case.id,
        order_id=payload.order_id,
        status=payload.status,
        reason=payload.reason,
        replacement_items=[item.model_dump() for item in resolved_items],
        eligible_amount=_eligible_amount_for_items(resolved_items, payload.eligible_amount),
        metadata_=payload.metadata,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    await post_message(
        db,
        case.id,
        f"Your replacement request has been created (Request ID: {req.id}).",
        sender_type="system",
    )

    return _serialize(req)


@router.get("/replacement-requests", response_model=ReplacementRequestListResponse)
async def list_replacement_requests(
    case_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user

    query = select(ReplacementRequest)

    if case_id:
        case = await _get_case(case_id, db)
        query = query.where(ReplacementRequest.case_id == case.id)

    if status_filter:
        if status_filter not in VALID_TRANSITIONS:
            raise HTTPException(status_code=422, detail="Invalid replacement request status")
        query = query.where(ReplacementRequest.status == status_filter)

    query = query.order_by(ReplacementRequest.created_at.desc())
    rows = (await db.execute(query)).scalars().all()
    return {"replacement_requests": [_serialize(row) for row in rows]}


@router.get("/cases/{case_id}/replacement_requests", response_model=ReplacementRequestListResponse)
async def list_case_replacement_requests(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user
    case = await _get_case(case_id, db)
    rows = (
        await db.execute(
            select(ReplacementRequest)
            .where(ReplacementRequest.case_id == case.id)
            .order_by(ReplacementRequest.created_at.desc())
        )
    ).scalars().all()
    return {"replacement_requests": [_serialize(row) for row in rows]}


@router.get("/replacement-requests/{replacement_request_id}")
async def get_replacement_request(
    replacement_request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user
    try:
        request_uuid = uuid.UUID(replacement_request_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid replacement_request_id") from exc

    req = (await db.execute(select(ReplacementRequest).where(ReplacementRequest.id == request_uuid))).scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=404, detail="Replacement request not found")
    return _serialize(req)


@router.patch("/replacement-requests/{replacement_request_id}")
async def patch_replacement_request(
    replacement_request_id: str,
    payload: ReplacementRequestPatch,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user

    try:
        request_uuid = uuid.UUID(replacement_request_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid replacement_request_id") from exc

    if payload.status not in VALID_TRANSITIONS:
        raise HTTPException(status_code=422, detail="Invalid replacement request status")

    req = (await db.execute(select(ReplacementRequest).where(ReplacementRequest.id == request_uuid))).scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=404, detail="Replacement request not found")

    allowed = VALID_TRANSITIONS.get(req.status, set())
    if payload.status not in allowed:
        raise HTTPException(status_code=409, detail="Invalid replacement request status transition")

    req.status = payload.status
    if payload.reason is not None:
        req.reason = payload.reason
    if payload.metadata is not None:
        req.metadata_ = payload.metadata

    now = datetime.now(timezone.utc)
    if payload.status == "approved":
        req.approved_at = now
    elif payload.status == "executing":
        req.executed_at = now
    elif payload.status in TERMINAL_STATUSES:
        req.closed_at = now

    await db.commit()
    await db.refresh(req)

    if payload.status == "approved":
        msg = "Your replacement request has been approved."
    elif payload.status == "executing":
        msg = "Your replacement request is now being processed."
    elif payload.status == "completed":
        msg = "Your replacement request has been completed."
    elif payload.status == "rejected":
        msg = f"Your replacement request was rejected. {req.reason}".strip()
    else:
        msg = "Your replacement request was cancelled."

    await post_message(db, req.case_id, msg, sender_type="system")

    return _serialize(req)
