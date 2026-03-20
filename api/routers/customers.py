"""Customer-facing endpoints — order history and case list."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import require_customer
from api.db.database import get_db
from api.db.models import Case

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/me/orders")
async def get_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    """Return all sim_orders for the authenticated customer email, with items."""
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in token")

    orders_q = text("""
        SELECT o.order_id, o.status, o.total_amount, o.created_at, o.fulfilled_at
        FROM sim_orders o
        WHERE o.customer_email = :email
        ORDER BY o.created_at DESC
    """)
    orders_result = await db.execute(orders_q, {"email": email})
    orders_rows = orders_result.mappings().all()

    orders = []
    for o in orders_rows:
        items_q = text("""
            SELECT item_id, item_name, quantity, unit_price
            FROM sim_order_items
            WHERE order_id = :order_id
        """)
        items_result = await db.execute(items_q, {"order_id": o["order_id"]})
        items = [dict(i) for i in items_result.mappings().all()]

        orders.append({
            "order_id": o["order_id"],
            "status": o["status"],
            "total_amount": float(o["total_amount"]),
            "created_at": str(o["created_at"]),
            "fulfilled_at": str(o["fulfilled_at"]) if o["fulfilled_at"] else None,
            "items": items,
        })

    return {"orders": orders}


@router.get("/me/cases")
async def get_my_cases(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_customer),
):
    """Return all cases where customer_email matches the JWT email."""
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not found in token")

    result = await db.execute(
        select(Case)
        .where(Case.customer_email == email)
        .order_by(Case.created_at.desc())
    )
    cases = result.scalars().all()

    return {
        "cases": [
            {
                "id": str(c.id),
                "reference_number": c.reference_number,
                "order_id": c.order_id,
                "dispute_type": c.dispute_type,
                "customer_name": c.customer_name,
                "customer_email": c.customer_email,
                "intake_message": c.intake_message,
                "status": c.status,
                "resolution_path": c.resolution_path,
                "created_at": str(c.created_at),
                "updated_at": str(c.updated_at),
                "closed_at": str(c.closed_at) if c.closed_at else None,
            }
            for c in cases
        ],
        "total": len(cases),
    }
