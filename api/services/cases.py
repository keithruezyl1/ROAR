"""Case business logic - reference number generation and status transitions."""

from __future__ import annotations

from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models import Case

# Valid status transitions - aligned to the documented ROAR close behavior,
# where customer or agent termination may close a case from any non-terminal state.
VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending_triage": ["pending_triage", "awaiting_approval", "escalated_human_required", "closed"],
    "awaiting_approval": ["approved_executing", "rejected_human_required", "closed"],
    "approved_executing": ["resolved", "closed"],
    "rejected_human_required": ["resolved", "closed"],
    "escalated_human_required": ["resolved", "closed"],
    "resolved": ["closed"],
    "closed": [],
}


def validate_status_transition(current: str, next_status: str) -> bool:
    """Return True if the transition from current to next_status is valid."""
    allowed = VALID_TRANSITIONS.get(current, [])
    return next_status in allowed


def get_valid_next_statuses(current: str) -> list[str]:
    """Return the list of valid next statuses from current."""
    return VALID_TRANSITIONS.get(current, [])


async def generate_reference_number(session: AsyncSession) -> str:
    """
    Generate the next CASE-XXXXX reference number.
    Uses COUNT of existing cases + 1 for simplicity.
    Thread-safe enough for hackathon demo volume.
    """
    result = await session.execute(select(func.count(Case.id)))
    count = result.scalar() or 0
    next_number = count + 1
    return f"CASE-{next_number:05d}"


def ensure_fields_present(payload: dict, required_fields: Iterable[str]) -> None:
    missing = [f for f in required_fields if payload.get(f) in (None, "")]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
