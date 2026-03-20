"""Chat messages: append-only."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.middleware import get_current_user
from api.db.database import get_db
from api.db.models import Case, ChatMessage
from api.services.n8n import trigger_workflow

router = APIRouter(prefix="/cases", tags=["messages"])

bearer_optional = HTTPBearer(auto_error=False)


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    sender_type: str


@router.post("/{case_id}/messages", status_code=201)
async def create_message(
    case_id: str,
    payload: MessageCreateRequest,
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Security(bearer_optional),
):
    if payload.sender_type not in ("customer", "ai", "agent", "system"):
        raise HTTPException(status_code=422, detail="Invalid sender_type")

    current_user: dict | None = None
    if payload.sender_type == "agent":
        if creds is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
        current_user = await get_current_user(credentials=creds)

    res = await db.execute(select(Case).where(Case.id == case_id))
    case = res.scalar_one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    sender_id = None
    if payload.sender_type == "agent":
        sender_id = current_user.get("sub") if current_user else None
        if not sender_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    msg = ChatMessage(
        case_id=case.id,
        sender_type=payload.sender_type,
        sender_id=sender_id,
        content=payload.content,
        metadata_=None,
    )
    db.add(msg)

    if payload.sender_type == "customer":
        case.last_customer_message_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(msg)

    # Frontend never calls n8n directly. The canonical architecture is:
    # Frontend -> FastAPI -> n8n (webhooks). This bridge auto-triggers WF1 only
    # while the case remains in pending_triage; once the case moves to another
    # status, customer messages will no longer retrigger WF1.
    if payload.sender_type == "customer" and case.status == "pending_triage":
        await trigger_workflow(
            "case-created",
            {
                "case_id": str(case.id),
                "dispute_type": case.dispute_type,
                "order_id": case.order_id,
                # For WF1 context initialization, always use the original intake message
                # stored on the case record (WF1 fetches full transcript itself).
                "intake_message": case.intake_message,
                "customer_name": case.customer_name,
                "customer_email": case.customer_email,
            },
        )

    return {
        "id": str(msg.id),
        "case_id": str(msg.case_id),
        "sender_type": msg.sender_type,
        "sender_id": str(msg.sender_id) if msg.sender_id else None,
        "content": msg.content,
        "metadata": msg.metadata_,
        "created_at": msg.created_at,
    }


@router.get("/{case_id}/messages")
async def list_messages(case_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ChatMessage).where(ChatMessage.case_id == case_id).order_by(ChatMessage.created_at.asc()))
    msgs = res.scalars().all()

    return {
        "messages": [
            {
                "id": str(m.id),
                "case_id": str(m.case_id),
                "sender_type": m.sender_type,
                "sender_id": str(m.sender_id) if m.sender_id else None,
                "content": m.content,
                "metadata": m.metadata_,
                "created_at": m.created_at,
            }
            for m in msgs
        ]
    }

