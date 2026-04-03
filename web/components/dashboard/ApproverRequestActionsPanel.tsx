'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Button } from '@/components/shared/Button';
import type { ReplacementRequest, ReplacementRequestStatus } from '@/types';

type RefundRequest = {
  id: string;
  case_id: string;
  order_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
};

type ReturnRequest = {
  id: string;
  case_id: string;
  order_id: string;
  item_ids: string[];
  return_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-TH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function requestTone(status: string) {
  if (status === 'pending') return 'border border-warning bg-warning-bg text-warning';
  if (status === 'approved' || status === 'executing') return 'border border-info bg-info-bg text-info';
  if (status === 'completed' || status === 'processed') return 'border border-success bg-success-bg text-success';
  return 'border border-danger bg-danger-bg text-danger';
}

function canTransitionReplacement(current: ReplacementRequestStatus, next: ReplacementRequestStatus) {
  if (current === 'pending') return next === 'approved' || next === 'rejected' || next === 'cancelled';
  if (current === 'approved') return next === 'executing' || next === 'cancelled';
  if (current === 'executing') return next === 'completed' || next === 'cancelled';
  return false;
}

export function ApproverRequestActionsPanel({
  caseId,
  onUpdated,
}: {
  caseId: string;
  onUpdated?: () => Promise<void> | void;
}) {
  const [refunds, setRefunds] = React.useState<RefundRequest[]>([]);
  const [returns, setReturns] = React.useState<ReturnRequest[]>([]);
  const [replacements, setReplacements] = React.useState<ReplacementRequest[]>([]);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [refundRes, returnRes, replacementRes] = await Promise.all([
      api.get<{ refund_requests: RefundRequest[] }>(`/cases/${encodeURIComponent(caseId)}/refund_requests`),
      api.get<{ return_requests: ReturnRequest[] }>(`/cases/${encodeURIComponent(caseId)}/return_requests`),
      api.get<{ replacement_requests: ReplacementRequest[] }>(`/cases/${encodeURIComponent(caseId)}/replacement_requests`),
    ]);

    setRefunds(refundRes.refund_requests ?? []);
    setReturns(returnRes.return_requests ?? []);
    setReplacements(replacementRes.replacement_requests ?? []);
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const afterUpdate = async () => {
    await load();
    await onUpdated?.();
  };

  const approveRefund = async (requestId: string) => {
    const key = `${requestId}:approve-refund`;
    setLoadingKey(key);
    try {
      await api.post(`/refund_requests/${requestId}/approve`, {});
      await afterUpdate();
    } finally {
      setLoadingKey(null);
    }
  };

  const updateReturn = async (requestId: string, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Enter a rejection reason for this return request.');
      if (input == null) return;
      if (!input.trim()) {
        window.alert('A rejection reason is required.');
        return;
      }
      reason = input.trim();
    }

    const key = `${requestId}:${status}`;
    setLoadingKey(key);
    try {
      await api.patch(`/return_requests/${requestId}`, {
        status,
        reason,
      });
      await afterUpdate();
    } finally {
      setLoadingKey(null);
    }
  };

  const updateReplacement = async (requestId: string, status: ReplacementRequestStatus) => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Enter an optional rejection reason for this replacement request.');
      if (input == null) return;
      reason = input.trim() || undefined;
    }

    const key = `${requestId}:${status}`;
    setLoadingKey(key);
    try {
      await api.patch(`/replacement-requests/${requestId}`, {
        status,
        reason,
      });
      await afterUpdate();
    } finally {
      setLoadingKey(null);
    }
  };

  const activeRefund = refunds.find((item) => item.status === 'pending') ?? null;
  const activeReturn = returns.find((item) => item.status === 'pending') ?? null;
  const activeReplacement =
    replacements.find((item) => item.status === 'pending' || item.status === 'approved' || item.status === 'executing') ?? null;

  return (
    <section className="rounded-card border border-border-default bg-bg-surface p-4">
      <div className="text-[15px] font-semibold text-text-primary">Pending request actions</div>
      <div className="mt-1 text-[12px] text-text-muted">Review and progress request records linked to this case.</div>

      <div className="mt-4 flex flex-col gap-3">
        {activeRefund ? (
          <article className="rounded-card border border-border-default bg-bg-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-text-primary">Refund request</div>
                <div className="mt-1 text-[12px] text-text-muted">THB {activeRefund.amount.toFixed(2)}</div>
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${requestTone(activeRefund.status)}`}>
                {activeRefund.status}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-text-secondary">{activeRefund.reason}</div>
            <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(activeRefund.created_at)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                loading={loadingKey === `${activeRefund.id}:approve-refund`}
                onClick={() => void approveRefund(activeRefund.id)}
              >
                Approve
              </Button>
            </div>
          </article>
        ) : null}

        {activeReturn ? (
          <article className="rounded-card border border-border-default bg-bg-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-text-primary">Return request</div>
                <div className="mt-1 text-[12px] text-text-muted">Order {activeReturn.order_id}</div>
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${requestTone(activeReturn.status)}`}>
                {activeReturn.status}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-text-secondary">{activeReturn.return_reason}</div>
            <div className="mt-2 text-[12px] text-text-muted">
              {activeReturn.item_ids.length > 0 ? `${activeReturn.item_ids.length} item(s)` : 'No item ids attached'}
            </div>
            <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(activeReturn.created_at)}</div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                loading={loadingKey === `${activeReturn.id}:approved`}
                onClick={() => void updateReturn(activeReturn.id, 'approved')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={loadingKey === `${activeReturn.id}:rejected`}
                onClick={() => void updateReturn(activeReturn.id, 'rejected')}
              >
                Reject
              </Button>
            </div>
          </article>
        ) : null}

        {activeReplacement ? (
          <article className="rounded-card border border-border-default bg-bg-elevated p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-text-primary">Replacement request</div>
                <div className="mt-1 text-[12px] text-text-muted">Order {activeReplacement.order_id}</div>
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${requestTone(activeReplacement.status)}`}>
                {activeReplacement.status}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-text-secondary">{activeReplacement.reason}</div>
            <div className="mt-2 text-[12px] text-text-muted">
              {activeReplacement.replacement_items.length > 0
                ? `${activeReplacement.replacement_items.length} replacement item(s)`
                : 'No replacement items attached'}
            </div>
            <div className="mt-2 text-[12px] text-text-muted">
              {activeReplacement.eligible_amount != null ? `THB ${activeReplacement.eligible_amount.toFixed(2)}` : 'Eligible amount not set'}
            </div>
            <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(activeReplacement.created_at)}</div>
            <div className="mt-3 flex items-center gap-2">
              {canTransitionReplacement(activeReplacement.status, 'approved') ? (
                <Button
                  size="sm"
                  variant="primary"
                  loading={loadingKey === `${activeReplacement.id}:approved`}
                  onClick={() => void updateReplacement(activeReplacement.id, 'approved')}
                >
                  Approve
                </Button>
              ) : null}
              {canTransitionReplacement(activeReplacement.status, 'rejected') ? (
                <Button
                  size="sm"
                  variant="danger"
                  loading={loadingKey === `${activeReplacement.id}:rejected`}
                  onClick={() => void updateReplacement(activeReplacement.id, 'rejected')}
                >
                  Reject
                </Button>
              ) : null}
            </div>
          </article>
        ) : null}

        {!activeRefund && !activeReturn && !activeReplacement ? (
          <div className="rounded-card border border-dashed border-border-default bg-bg-base px-4 py-6 text-center text-[13px] text-text-muted">
            No request actions are currently available for this case.
          </div>
        ) : null}
      </div>
    </section>
  );
}
