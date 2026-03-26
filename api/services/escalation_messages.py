"""Escalation agent customer-facing message helpers.

These helpers centralize consistent copy and ensure messages are persisted
as chat thread records (append-only) with correct sender_type semantics.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models import ChatMessage

TEMPLATES: dict[str, str] = {
    "refund_created": "Your refund request for ฿{amount} has been created. Refund timing depends on your original payment method.",
    "partial_refund_created": "A partial refund request for ฿{amount} has been created for your case.",
    "return_created": "Your return request has been created. Please follow the return instructions provided by customer care.",
    "return_approved": "Your return request has been approved.",
    "return_rejected": "Your return request has been rejected. {reason}",
    "refund_denied": "We're unable to approve your refund request. {reason}",
    "duplicate_refund": "Our records show that this order already has a refund in progress or completed, so no additional refund request was created.",
}


async def post_message(
    db: AsyncSession,
    case_id: str | uuid.UUID,
    content: str,
    *,
    sender_type: str = "system",
    sender_id: str | uuid.UUID | None = None,
) -> ChatMessage:
    """Persist a chat message for an escalation action.

    sender_type:
      - "system": operational/status notification
      - "agent": live agent speaking (includes denial reasoning)
    """

    case_uuid = uuid.UUID(str(case_id))

    sender_uuid: uuid.UUID | None = None
    if sender_id is not None:
        sender_uuid = uuid.UUID(str(sender_id))

    msg = ChatMessage(
        case_id=case_uuid,
        sender_type=sender_type,
        sender_id=sender_uuid,
        content=content,
        metadata_=None,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

