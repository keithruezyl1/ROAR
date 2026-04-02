'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Button } from '@/components/shared/Button';
import type { ReplacementRequest, ReplacementRequestStatus } from '@/types';

function statusTone(status: ReplacementRequestStatus) {
  if (status === 'completed') return 'border border-success bg-success-bg text-success';
  if (status === 'approved' || status === 'executing') return 'border border-warning bg-warning-bg text-warning';
  if (status === 'rejected' || status === 'cancelled') return 'border border-danger bg-danger-bg text-danger';
  return 'border border-info bg-info-bg text-info';
}

function itemLabel(item: ReplacementRequest['replacement_items'][number]) {
  return item.product_name || item.item_id || item.sku || 'Unknown item';
}

function formatAmount(amount: number | null) {
  if (amount == null) return 'Not set';
  return `THB ${amount.toFixed(2)}`;
}

function canTransition(current: ReplacementRequestStatus, next: ReplacementRequestStatus) {
  if (current === 'pending') return next === 'approved' || next === 'rejected' || next === 'cancelled';
  if (current === 'approved') return next === 'executing' || next === 'cancelled';
  if (current === 'executing') return next === 'completed' || next === 'cancelled';
  return false;
}

export function ReplacementRequestPanel({ caseId }: { caseId: string }) {
  const [items, setItems] = React.useState<ReplacementRequest[]>([]);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await api.get<{ replacement_requests: ReplacementRequest[] }>(
      `/cases/${encodeURIComponent(caseId)}/replacement_requests`
    );
    setItems(res.replacement_requests ?? []);
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (requestId: string, nextStatus: ReplacementRequestStatus) => {
    const key = `${requestId}:${nextStatus}`;
    setLoadingKey(key);
    try {
      await api.patch(`/replacement-requests/${requestId}`, { status: nextStatus });
      await load();
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <section className="rounded-card border border-border-default bg-bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-[15px] font-semibold text-text-primary">Replacement Requests</div>
          <div className="text-[12px] text-text-muted">
            Request state, item coverage, and operational status.
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-2 text-[13px] text-text-muted">No replacement requests for this case yet.</div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {items.map((request) => (
            <article key={request.id} className="rounded-card border border-border-default bg-bg-elevated">
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="font-mono text-[11px] text-text-muted">{request.id}</div>
                    <div className="text-[14px] font-medium text-text-primary">Order {request.order_id}</div>
                  </div>
                  <span className={`rounded-pill px-2 py-[3px] text-[11px] font-medium capitalize ${statusTone(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="flex flex-col gap-3 rounded-btn border border-border-default bg-bg-surface px-3 py-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Request reason
                    </div>
                    <div className="text-[13px] leading-6 text-text-secondary">{request.reason}</div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-btn border border-border-default bg-bg-surface px-3 py-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Eligible amount
                    </div>
                    <div className="text-[16px] font-semibold text-text-primary">
                      {formatAmount(request.eligible_amount)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {request.replacement_items.map((item, index) => (
                    <div key={`${request.id}:${index}`} className="rounded-btn border border-border-default bg-bg-surface px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="text-[13px] font-medium text-text-primary">
                            {itemLabel(item)} x {item.quantity}
                          </div>
                          <div className="font-mono text-[11px] text-text-muted">
                            {item.sku || item.item_id || 'No SKU'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.warehouse_location ? (
                            <span className="rounded-pill border border-border-default bg-bg-base px-2.5 py-1 text-[11px] text-text-secondary">
                              {item.warehouse_location}
                            </span>
                          ) : null}
                          {item.quantity_available_now != null ? (
                            <span className="rounded-pill border border-success bg-success-bg px-2.5 py-1 text-[11px] font-medium text-success">
                              {item.quantity_available_now} available
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border-default pt-4">
                  {canTransition(request.status, 'approved') ? (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={loadingKey === `${request.id}:approved`}
                      onClick={() => void updateStatus(request.id, 'approved')}
                    >
                      Approve
                    </Button>
                  ) : null}

                  {canTransition(request.status, 'executing') ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={loadingKey === `${request.id}:executing`}
                      onClick={() => void updateStatus(request.id, 'executing')}
                    >
                      Execute
                    </Button>
                  ) : null}

                  {canTransition(request.status, 'completed') ? (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={loadingKey === `${request.id}:completed`}
                      onClick={() => void updateStatus(request.id, 'completed')}
                    >
                      Complete
                    </Button>
                  ) : null}

                  {canTransition(request.status, 'rejected') ? (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={loadingKey === `${request.id}:rejected`}
                      onClick={() => void updateStatus(request.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  ) : null}

                  {canTransition(request.status, 'cancelled') ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={loadingKey === `${request.id}:cancelled`}
                      onClick={() => void updateStatus(request.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
