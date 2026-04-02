# api/routers/return_requests.py
"""
Return requests and replacement order management
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID
import asyncpg
from datetime import datetime

from api.database import get_db_pool

router = APIRouter(prefix="/return_requests", tags=["return_requests"])


class ReturnRequestItem(BaseModel):
    item_id: str
    product_name: str
    quantity: int
    unit_price: float


class ReturnRequestCreate(BaseModel):
    case_id: UUID
    order_id: str
    request_type: str = Field(..., pattern="^(replacement|return)$")
    items: List[ReturnRequestItem]
    status: str = Field(default="pending", pattern="^(pending|approved|rejected|completed)$")


class ReturnRequestResponse(BaseModel):
    id: UUID
    case_id: UUID
    order_id: str
    request_type: str
    items: List[Dict[str, Any]]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]


@router.post("", response_model=ReturnRequestResponse)
async def create_return_request(
    payload: ReturnRequestCreate,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Create a replacement order or return request.
    Used by WF5 (Resolution Agent) after approval.
    """
    async with pool.acquire() as conn:
        # Validate case exists
        case = await conn.fetchrow(
            "SELECT id, order_id, status FROM cases WHERE id = $1",
            payload.case_id
        )
        
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        # Insert return request
        items_json = [item.dict() for item in payload.items]
        
        row = await conn.fetchrow(
            """
            INSERT INTO return_requests (case_id, order_id, request_type, items, status, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING id, case_id, order_id, request_type, items, status, created_at, completed_at
            """,
            payload.case_id,
            payload.order_id,
            payload.request_type,
            items_json,
            payload.status
        )
        
        # If replacement order and status is approved, create new order in sim_orders
        if payload.request_type == "replacement" and payload.status == "approved":
            # Generate new order ID
            new_order_id = f"REP-{payload.order_id}"
            
            # Create replacement order
            await conn.execute(
                """
                INSERT INTO sim_orders (order_id, customer_name, customer_email, order_date, total_amount, order_status)
                SELECT $1, customer_name, customer_email, CURRENT_TIMESTAMP, total_amount, 'pending'
                FROM sim_orders
                WHERE order_id = $2
                """,
                new_order_id,
                payload.order_id
            )
            
            # Create order items for replacement
            for item in payload.items:
                await conn.execute(
                    """
                    INSERT INTO sim_order_items (order_id, item_id, product_name, quantity, unit_price)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    new_order_id,
                    item.item_id,
                    item.product_name,
                    item.quantity,
                    item.unit_price
                )
        
        return ReturnRequestResponse(
            id=row['id'],
            case_id=row['case_id'],
            order_id=row['order_id'],
            request_type=row['request_type'],
            items=row['items'],
            status=row['status'],
            created_at=row['created_at'],
            completed_at=row['completed_at']
        )


@router.get("/{case_id}", response_model=List[ReturnRequestResponse])
async def get_return_requests_for_case(
    case_id: UUID,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get all return requests for a case.
    Used by approver/escalation UI to show replacement history.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, case_id, order_id, request_type, items, status, created_at, completed_at
            FROM return_requests
            WHERE case_id = $1
            ORDER BY created_at DESC
            """,
            case_id
        )
        
        return [
            ReturnRequestResponse(
                id=row['id'],
                case_id=row['case_id'],
                order_id=row['order_id'],
                request_type=row['request_type'],
                items=row['items'],
                status=row['status'],
                created_at=row['created_at'],
                completed_at=row['completed_at']
            )
            for row in rows
        ]


@router.patch("/{request_id}/complete")
async def complete_return_request(
    request_id: UUID,
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Mark a return request as completed.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE return_requests
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, status, completed_at
            """,
            request_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Return request not found")
        
        return {
            "id": row['id'],
            "status": row['status'],
            "completed_at": row['completed_at']
        }
