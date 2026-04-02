"""Background inactivity timeout service.

Checks every 5 minutes for cases inactive > 15 minutes.
Marks them closed with closed_by=timeout and close_reason=unresponsive,
then fires the n8n /webhooks/conversation-closed workflow for each.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, select

from api.db.database import AsyncSessionLocal
from api.db.models import Case
from api.services.n8n import trigger_workflow

logger = logging.getLogger(__name__)

INACTIVITY_TIMEOUT_MINUTES = 15
CHECK_INTERVAL_SECONDS = 300  # 5 minutes

ACTIVE_STATUSES = [
    "pending_triage",
]


async def check_and_close_inactive_cases() -> int:
    """
    Find intake-phase cases where last_customer_message_at is older than
    INACTIVITY_TIMEOUT_MINUTES and close them with timeout reason.
    Human-handled, approval, and resolved states must remain open until explicitly closed.
    Returns number of cases closed.
    """
    closed_count = 0
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES)

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(Case).where(
                    and_(
                        Case.status.in_(ACTIVE_STATUSES),
                        Case.last_customer_message_at.is_not(None),
                        Case.last_customer_message_at < cutoff,
                    )
                )
            )
            cases = result.scalars().all()

            for case in cases:
                case.status = "closed"
                case.closed_by = "timeout"
                case.close_reason = "unresponsive"
                case.closed_at = datetime.now(timezone.utc)
                closed_count += 1
                logger.info(
                    "Auto-closed case %s due to inactivity (last message: %s)",
                    case.reference_number,
                    case.last_customer_message_at,
                )

            if closed_count > 0:
                await session.commit()

                # Fire n8n webhook for each closed case to generate reports
                for case in cases:
                    await trigger_workflow(
                        "conversation-closed",
                        {
                            "case_id": str(case.id),
                            "closed_by": "timeout",
                            "close_reason": "unresponsive",
                        },
                    )

        except Exception:
            logger.exception("Timeout service error")
            await session.rollback()

    return closed_count


async def run() -> None:
    """
    Background loop — runs every CHECK_INTERVAL_SECONDS.
    Call this as an asyncio task from FastAPI lifespan.
    """
    logger.info("Inactivity timeout service started")
    while True:
        try:
            count = await check_and_close_inactive_cases()
            if count > 0:
                logger.info("Timeout service: closed %d inactive case(s)", count)
        except Exception:
            logger.exception("Timeout service loop error")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

