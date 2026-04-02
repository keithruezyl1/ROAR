"""Case reports."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.auth.middleware import require_agent
from api.config import settings
from api.db.database import get_db
from api.db.models import Case, CaseReport

router = APIRouter(prefix="/cases", tags=["reports"])


class CaseReportUpsert(BaseModel):
    case_id: str
    dispute_type: str
    customer_name: str
    customer_email: str
    order_id: str
    intent_classification: str
    data_sources_queried: list[str]
    policies_applied: list[str]
    slas_applied: list[str]
    triage_decision: dict
    resolution_path: str
    approval_outcome: str | None = None
    rejection_reason: str | None = None
    resolution_actions: dict | None = None
    evidence_bundle: dict | None = None
    proof_uploads: list[dict] | None = None
    outcome_summary: str
    close_reason: str


@router.get("/{case_id}/report")
async def get_report(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_agent),
):
    res = await db.execute(select(CaseReport).where(CaseReport.case_id == case_id))
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return report.to_dict()


@router.post("/{case_id}/report")
async def upsert_report(
    case_id: str,
    payload: CaseReportUpsert,
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
):
    if x_webhook_secret != settings.n8n_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    case_res = await db.execute(
        select(Case)
        .options(selectinload(Case.proof_uploads))
        .where(Case.id == case_id)
    )
    case = case_res.scalar_one_or_none()

    res = await db.execute(select(CaseReport).where(CaseReport.case_id == case_id))
    report = res.scalar_one_or_none()

    data = payload.model_dump()
    if case is not None:
        if data.get("evidence_bundle") is None and isinstance(case.information_bundle, dict):
            data["evidence_bundle"] = case.information_bundle.get("evidence_bundle")
        if data.get("proof_uploads") is None and isinstance(case.information_bundle, dict):
            data["proof_uploads"] = case.information_bundle.get("proof_uploads")

    if report is None:
        report = CaseReport(**data)
        db.add(report)
    else:
        for k, v in data.items():
            setattr(report, k, v)

    await db.commit()
    await db.refresh(report)
    return report.to_dict()

