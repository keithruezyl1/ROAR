"""Inbound webhook endpoints (n8n → FastAPI)."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from api.config import settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _require_secret(x_webhook_secret: str | None) -> None:
    if x_webhook_secret != settings.n8n_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


@router.post("/case-created")
async def webhook_case_created(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/bundle-ready")
async def webhook_bundle_ready(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/triage-complete")
async def webhook_triage_complete(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/triage-escalation")
async def webhook_triage_escalation(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/resolution-plan")
async def webhook_resolution_plan(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/approved")
async def webhook_approved(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}


@router.post("/conversation-closed")
async def webhook_conversation_closed(payload: dict, x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret")):
    _require_secret(x_webhook_secret)
    return {"status": "ok"}

