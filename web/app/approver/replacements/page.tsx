'use client';

import * as React from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { api } from '@/lib/api';
import type { ReplacementRequest, ReplacementRequestStatus } from '@/types';

type QueueItem = ReplacementRequest & {
  case_reference_number?: string;
};

function canTransition(current: ReplacementRequestStatus, next: ReplacementRequestStatus) {
  if (current === 'pending') return next === 'approved' || next === 'rejected' || next === 'cancelled';
  if (current === 'approved') return next === 'executing' || next === 'cancelled';
  if (current === 'executing') return next === 'completed' || next === 'cancelled';
  return false;
}

function statusTone(status: ReplacementRequestStatus) {
  if (status === 'completed') return 'border border-success bg-success-bg text-success';
  if (status === 'approved' || status === 'executing') return 'border border-warning bg-warning-bg text-warning';
  if (status === 'rejected' || status === 'cancelled') return 'border border-danger bg-danger-bg text-danger';
  return 'border border-info bg-info-bg text-info';
}

function statusLabel(status: ReplacementRequestStatus) {
  if (status === 'executing') return 'In Progress';
  return status;
}

function itemLabel(item: QueueItem['replacement_items'][number]) {
  return item.product_name || item.item_id || item.sku || 'Unknown item';
}

function formatAmount(amount: number | null) {
  if (amount == null) return 'Not set';
  return `THB ${amount.toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function requestDescriptor(request: QueueItem) {
  const count = request.replacement_items.length;
  if (count === 0) return 'No items attached';
  if (count === 1) return itemLabel(request.replacement_items[0]);
  return `${itemLabel(request.replacement_items[0])} +${count - 1} more`;
}

function inventoryState(request: QueueItem) {
  if (request.replacement_items.length === 0) return 'No inventory detail';
  const allReady = request.replacement_items.every(
    (item) => item.quantity_available_now == null || item.quantity_available_now >= item.quantity
  );
  return allReady ? 'Warehouse-ready' : 'Needs stock review';
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-btn border border-border-default bg-bg-base px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="text-[14px] text-text-primary">{value}</div>
    </div>
  );
}

export default function ReplacementRequestsPage() {
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<ReplacementRequestStatus | 'all'>('all');
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const qs = statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
    const res = await api.get<{ replacement_requests: QueueItem[] }>(`/replacement-requests${qs}`);
    setItems(res.replacement_requests ?? []);
  }, [statusFilter]);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  const selectedRequest = React.useMemo(
    () => items.find((request) => request.id === selectedId) ?? null,
    [items, selectedId]
  );

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

  const renderActions = (request: QueueItem) => (
    <div className="flex flex-wrap items-center gap-2">
      {canTransition(request.status, 'approved') ? (
        <Button
          size="sm"
          variant="primary"
          loading={loadingKey === `${request.id}:approved`}
          onClick={() => void updateStatus(request.id, 'approved')}
        >
          Approve request
        </Button>
      ) : null}

      {canTransition(request.status, 'executing') ? (
        <Button
          size="sm"
          variant="secondary"
          loading={loadingKey === `${request.id}:executing`}
          onClick={() => void updateStatus(request.id, 'executing')}
        >
          Mark executing
        </Button>
      ) : null}

      {canTransition(request.status, 'completed') ? (
        <Button
          size="sm"
          variant="primary"
          loading={loadingKey === `${request.id}:completed`}
          onClick={() => void updateStatus(request.id, 'completed')}
        >
          Complete replacement
        </Button>
      ) : null}

      {canTransition(request.status, 'rejected') ? (
        <Button
          size="sm"
          variant="danger"
          loading={loadingKey === `${request.id}:rejected`}
          onClick={() => void updateStatus(request.id, 'rejected')}
        >
          Reject request
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
  );

  return (
    <AppShell role="approver" title="Replacement Requests">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-card border border-border-default bg-bg-elevated px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-[18px] font-semibold text-text-primary">Active queue</div>
            <p className="text-[14px] text-text-muted">
              Open a request to review approval context, item-level coverage, and fulfillment actions.
            </p>
          </div>

          <div className="flex min-w-[220px] flex-col gap-2">
            <label
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted"
              htmlFor="replacement-status-filter"
            >
              Filter by status
            </label>
            <select
              id="replacement-status-filter"
              className="rounded-btn border border-border-default bg-bg-base px-3 py-2 text-[14px] text-text-primary"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReplacementRequestStatus | 'all')}
            >
              <option value="all">All requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="executing">Executing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-strong bg-bg-surface px-8 py-14 text-center">
            <div className="mx-auto flex max-w-sm flex-col gap-2">
              <div className="text-[18px] font-semibold text-text-primary">No replacement requests found</div>
              <p className="text-[14px] leading-6 text-text-muted">
                Requests that match the current filter will appear here once they are created by the workflow.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
                className="grid gap-4 rounded-card border border-border-default bg-bg-elevated px-4 py-4 text-left transition-colors hover:border-border-strong hover:bg-bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base md:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]"
              >
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone(request.status)}`}>
                      {statusLabel(request.status)}
                    </span>
                    <span className="rounded-pill border border-border-default bg-bg-base px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {inventoryState(request)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-[18px] font-semibold text-text-primary">Order {request.order_id}</div>
                    <div className="font-mono text-[12px] text-text-muted">Request {request.id}</div>
                  </div>

                  <div className="flex flex-col gap-1 text-[14px]">
                    <div className="truncate text-text-primary">{requestDescriptor(request)}</div>
                    <div className="line-clamp-1 text-text-muted">{request.reason}</div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-default pt-4 text-[12px] text-text-secondary md:border-l md:border-t-0 md:pl-4 md:pt-0">
                  <div className="flex flex-col gap-1">
                    <dt className="uppercase tracking-[0.12em] text-text-muted">Eligible</dt>
                    <dd className="text-[14px] font-semibold text-text-primary">{formatAmount(request.eligible_amount)}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="uppercase tracking-[0.12em] text-text-muted">Items</dt>
                    <dd className="text-[14px] font-semibold text-text-primary">{request.replacement_items.length}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="uppercase tracking-[0.12em] text-text-muted">Created</dt>
                    <dd>{formatDate(request.created_at)}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="uppercase tracking-[0.12em] text-text-muted">Updated</dt>
                    <dd>{formatDate(request.updated_at ?? request.requested_at ?? request.created_at)}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={selectedRequest != null}
        onClose={() => setSelectedId(null)}
        title={selectedRequest ? `Replacement Request ${selectedRequest.order_id}` : 'Replacement Request'}
        wide
      >
        {selectedRequest ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone(selectedRequest.status)}`}>
                    {statusLabel(selectedRequest.status)}
                  </span>
                  <span className="rounded-pill border border-border-default bg-bg-base px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {inventoryState(selectedRequest)}
                  </span>
                </div>
                <div className="text-[22px] font-semibold leading-tight text-text-primary">
                  Order {selectedRequest.order_id}
                </div>
                <div className="font-mono text-[12px] text-text-muted">Request {selectedRequest.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                <DetailRow label="Eligible amount" value={formatAmount(selectedRequest.eligible_amount)} />
                <DetailRow label="Items" value={selectedRequest.replacement_items.length} />
                <DetailRow label="Created" value={formatDate(selectedRequest.created_at)} />
                <DetailRow label="Last update" value={formatDate(selectedRequest.updated_at ?? selectedRequest.requested_at ?? selectedRequest.created_at)} />
              </div>
            </div>

            <section className="flex flex-col gap-3 rounded-card border border-border-default bg-bg-surface px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Approval context
              </div>
              <p className="text-[15px] leading-6 text-text-primary">{selectedRequest.reason}</p>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Replacement items
                </div>
                <div className="text-[12px] text-text-muted">{inventoryState(selectedRequest)}</div>
              </div>

              <div className="grid gap-3">
                {selectedRequest.replacement_items.map((item, index) => (
                  <div
                    key={`${selectedRequest.id}:${index}`}
                    className="rounded-card border border-border-default bg-bg-elevated px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="text-[16px] font-semibold text-text-primary">{itemLabel(item)}</div>
                        <div className="font-mono text-[12px] text-text-muted">{item.sku || item.item_id || 'No SKU'}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-pill border border-border-default bg-bg-base px-2.5 py-1 text-[11px] text-text-secondary">
                          Qty {item.quantity}
                        </span>
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
                        {item.unit_price != null ? (
                          <span className="rounded-pill border border-border-default bg-bg-base px-2.5 py-1 text-[11px] text-text-secondary">
                            THB {item.unit_price.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
              {renderActions(selectedRequest)}
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
