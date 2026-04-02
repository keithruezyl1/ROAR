"""Order helper routes (item + inventory view)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_agent
from api.db.database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/{order_id}/items_with_inventory")
async def get_order_items_with_inventory(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    _ = current_user
    rows = (
        await db.execute(
            text(
                """
                SELECT
                    oi.order_id,
                    oi.item_id,
                    oi.item_name,
                    oi.quantity AS quantity_ordered,
                    oi.unit_price,
                    sr.quantity_available AS quantity_available_now,
                    sr.warehouse_location
                FROM sim_order_items oi
                LEFT JOIN sim_stock_records sr ON oi.item_id = sr.item_id
                WHERE oi.order_id = :order_id
                ORDER BY oi.item_id ASC
                """
            ),
            {"order_id": order_id},
        )
    ).mappings().all()

    return [dict(r) for r in rows]

