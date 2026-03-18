"""Policies read-only list."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.database import get_db
from api.db.models import Policy

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(default=None),
):
    q = select(Policy).order_by(Policy.category.asc(), Policy.slug.asc())
    if category:
        q = q.where(Policy.category == category)

    res = await db.execute(q)
    policies = res.scalars().all()

    return [
        {
            "id": str(p.id),
            "category": p.category,
            "title": p.title,
            "slug": p.slug,
            "content": p.content,
            "created_at": p.created_at,
        }
        for p in policies
    ]

