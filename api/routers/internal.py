"""Internal data source endpoints for n8n WF2."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.database import get_db
from api.services.timeout_service import check_and_close_inactive_cases

router = APIRouter(prefix="/internal/sources", tags=["internal"])

debug_router = APIRouter(prefix="/internal/debug", tags=["internal-debug"])


def _require_secret(x_webhook_secret: str | None) -> None:
    if x_webhook_secret != settings.n8n_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


@router.get("/orders")
async def get_orders(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    order = (await db.execute(text("SELECT * FROM sim_orders WHERE order_id=:order_id"), {"order_id": order_id})).mappings().first()
    if order is None:
        return {"order": None, "order_items": []}

    items = (await db.execute(text("SELECT * FROM sim_order_items WHERE order_id=:order_id"), {"order_id": order_id})).mappings().all()
    return {"order": dict(order), "order_items": [dict(i) for i in items]}


@router.get("/transactions")
async def get_transactions(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    txn = (await db.execute(text("SELECT * FROM sim_transactions WHERE order_id=:order_id ORDER BY transacted_at DESC LIMIT 1"), {"order_id": order_id})).mappings().first()
    return {"transaction": dict(txn) if txn else None}


@router.get("/refunds")
async def get_refunds(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    refunds = (await db.execute(text("SELECT * FROM sim_refund_records WHERE order_id=:order_id"), {"order_id": order_id})).mappings().all()
    return {"refund_records": [dict(r) for r in refunds]}


@router.get("/shipments")
async def get_shipments(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    shipment = (await db.execute(text("SELECT * FROM sim_shipments WHERE order_id=:order_id ORDER BY shipped_at DESC NULLS LAST LIMIT 1"), {"order_id": order_id})).mappings().first()
    if shipment is None:
        return {"shipment": None, "tracking_events": []}

    events = (await db.execute(text("SELECT * FROM sim_tracking_events WHERE shipment_id=:shipment_id ORDER BY event_time ASC"), {"shipment_id": shipment["id"]})).mappings().all()
    return {"shipment": dict(shipment), "tracking_events": [dict(e) for e in events]}


@router.get("/inventory")
async def get_inventory(
    item_ids: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    ids = [s.strip() for s in item_ids.split(",") if s.strip()]
    if not ids:
        return {"stock_records": []}

    rows = (await db.execute(text("SELECT * FROM sim_stock_records WHERE item_id = ANY(:ids)"), {"ids": ids})).mappings().all()
    return {"stock_records": [dict(r) for r in rows]}


@router.get("/duplicate-check")
async def duplicate_check(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    _require_secret(x_webhook_secret)

    row = (await db.execute(text("SELECT id FROM cases WHERE order_id=:order_id AND status != 'closed' ORDER BY created_at DESC LIMIT 1"), {"order_id": order_id})).first()
    if row is None:
        return {"has_duplicate": False}
    return {"has_duplicate": True, "case_id": str(row[0])}


@debug_router.post("/timeout-run-once")
async def timeout_run_once():
    """
    Development-only helper to run the inactivity timeout check once on demand.
    """
    if settings.app_env != "development":
        raise HTTPException(status_code=404, detail="Not found")

    closed = await check_and_close_inactive_cases()
    return {"closed_count": closed}

