'use client';

import * as React from 'react';

import { api, customerApi } from '@/lib/api';
import { decodeToken } from '@/lib/auth';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';
import { INTAKE_ISSUE_OPTIONS, issueRequiresProof, saveCaseContext } from '@/lib/intakeContext';
import type {
  CustomerOrder,
  DisputeSubtype,
  DisputeType,
  IntakeReason,
  ResolutionPreference,
} from '@/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getOrderPrimaryItem(order: CustomerOrder) {
  const primary = order.items[0]?.item_name || 'Order item';
  const extraCount = Math.max(0, order.items.length - 1);
  return { primary, extraCount };
}

function getOrderStatusTone(status: string) {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'fulfilled':
      return 'bg-success text-text-inverse';
    case 'pending':
      return 'bg-warning text-text-inverse';
    case 'returned':
      return 'bg-info text-text-inverse';
    case 'cancelled':
    case 'canceled':
      return 'bg-danger text-text-inverse';
    default:
      return 'bg-bg-sunken text-text-secondary';
  }
}

function isOrderBlocked(order: CustomerOrder) {
  if (order.disputable === false) return true;
  const status = String(order.status || '').toLowerCase();
  return status === 'cancelled' || status === 'canceled';
}

function getOrderStatusLabel(order: CustomerOrder) {
  return isOrderBlocked(order) ? 'Canceled - cannot dispute' : order.status === 'fulfilled' ? 'Fulfilled' : order.status;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-7 w-7 transition-transform duration-fast ${open ? 'rotate-180' : ''}`} aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ISSUE_CATEGORY_LABELS: Record<'delivery' | 'product' | 'order', string> = {
  delivery: 'Delivery Issues',
  product: 'Product Issues',
  order: 'Order Issues',
};

const ISSUE_CATEGORY_ORDER: Array<'delivery' | 'product' | 'order'> = ['delivery', 'product', 'order'];

export function IntakeForm({
  onCreated,
}: {
  onCreated: (v: { caseId: string; intakeReason: IntakeReason; disputeType: DisputeType }) => void;
}) {
  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);

  const [selectedOrderId, setSelectedOrderId] = React.useState('');
  const [orderQuery, setOrderQuery] = React.useState('');
  const [orderOpen, setOrderOpen] = React.useState(false);

  const [selectedIssueId, setSelectedIssueId] = React.useState<DisputeSubtype | null>(null);
  const [issueQuery, setIssueQuery] = React.useState('');
  const [issueOpen, setIssueOpen] = React.useState(false);

  const [resolutionPreference, setResolutionPreference] = React.useState<ResolutionPreference | null>(null);
  const [otherDetails, setOtherDetails] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState('');

  const selectedOrder = React.useMemo(
    () => orders.find((order) => order.order_id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const selectedOrderBlocked = React.useMemo(() => (selectedOrder ? isOrderBlocked(selectedOrder) : false), [selectedOrder]);

  const filteredOrders = React.useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const itemNames = order.items.map((item) => item.item_name).join(' ');
      const hay = `${order.order_id} ${itemNames}`.toLowerCase();
      return hay.includes(query);
    });
  }, [orders, orderQuery]);

  const selectedIssue = React.useMemo(
    () => INTAKE_ISSUE_OPTIONS.find((option) => option.id === selectedIssueId) || null,
    [selectedIssueId]
  );

  const filteredIssues = React.useMemo(() => {
    const query = issueQuery.trim().toLowerCase();
    if (!query) return INTAKE_ISSUE_OPTIONS;
    return INTAKE_ISSUE_OPTIONS.filter((option) => option.label.toLowerCase().includes(query));
  }, [issueQuery]);

  const groupedIssues = React.useMemo(() => {
    return ISSUE_CATEGORY_ORDER.map((category) => ({
      category,
      label: ISSUE_CATEGORY_LABELS[category],
      options: filteredIssues.filter((option) => option.category === category),
    })).filter((group) => group.options.length > 0);
  }, [filteredIssues]);

  React.useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        const res = await customerApi.getMyOrders();
        if (cancelled) return;
        const sorted = [...res.orders].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
        setOrders(sorted);
        if (sorted.length > 0) {
          const firstSelectable = sorted.find((order) => !isOrderBlocked(order))?.order_id ?? sorted[0].order_id;
          const first = firstSelectable;
          setSelectedOrderId((current) => current || first);
          setOrderQuery((current) => current || '');
        }
      } catch (err) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : 'Unable to load your orders.');
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    };

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedIssue) {
      setResolutionPreference(null);
      return;
    }
    if (selectedIssue.resolutionOptions.length === 0) {
      setResolutionPreference(null);
      return;
    }
    if (selectedIssue.resolutionOptions.length === 1) {
      setResolutionPreference(selectedIssue.resolutionOptions[0]);
    }
  }, [selectedIssue]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!selectedOrderId) nextErrors.order_id = 'Please select an order.';
    if (selectedOrder && isOrderBlocked(selectedOrder)) {
      nextErrors.order_id = 'This order was canceled and cannot be disputed.';
    }
    if (!selectedIssue) nextErrors.dispute_subtype = 'Please select what went wrong.';

    if (selectedIssue?.resolutionOptions.length && !resolutionPreference) {
      nextErrors.resolution_preference = 'Please choose a requested resolution.';
    }

    if (selectedIssue?.id === 'other' && otherDetails.trim().length < 10) {
      nextErrors.intake_message = 'Please describe your issue in at least 10 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError('');
    if (!validate() || !selectedIssue) return;

    const auth = decodeToken();
    if (!auth?.email || !auth.full_name) {
      setApiError('Your session is missing customer identity details. Please log in again.');
      return;
    }

    const intakeMessage = selectedIssue.id === 'other' ? otherDetails.trim() : selectedIssue.label;

    const selectedResolutionPreference =
      selectedIssue.resolutionOptions.length > 0
        ? (resolutionPreference ?? selectedIssue.resolutionOptions[0])
        : null;

    try {
      setLoading(true);
      const res = await api.post<{ id: string }>('/cases', {
        order_id: selectedOrderId,
        dispute_type: selectedIssue.disputeType,
        dispute_subtype: selectedIssue.id,
        resolution_preference: selectedResolutionPreference,
        customer_name: auth.full_name,
        customer_email: auth.email,
        intake_message: intakeMessage,
      });

      saveCaseContext(res.id, {
        intakeReason: selectedIssue.id,
        disputeType: selectedIssue.disputeType,
        disputeSubtype: selectedIssue.id,
        resolutionPreference: selectedResolutionPreference,
      });

      onCreated({
        caseId: res.id,
        intakeReason: selectedIssue.id,
        disputeType: selectedIssue.disputeType,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create case.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const stepOrderDone = Boolean(selectedOrderId);
  const stepIssueDone = Boolean(selectedIssue);

  return (
    <form onSubmit={submit} className="w-full rounded-card border border-border-default bg-bg-surface p-6">
      <div className="mb-4">
        <div className="text-[24px] font-bold">Start a case</div>
        <div className="mt-2 text-[13px] text-text-secondary">Submit your dispute and chat with ROAR.</div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <div className={`h-1 flex-1 rounded-full ${stepOrderDone ? 'bg-primary' : 'bg-border-default'}`} />
        <div className={`h-1 flex-1 rounded-full ${stepIssueDone ? 'bg-primary' : 'bg-border-default'}`} />
        <div
          className={`h-1 flex-1 rounded-full ${
            selectedIssue?.resolutionOptions.length ? (resolutionPreference ? 'bg-primary' : 'bg-border-default') : stepIssueDone ? 'bg-primary' : 'bg-border-default'
          }`}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-[6px] text-[13px] text-text-secondary">Step 1: Select your order</div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (loadingOrders || orders.length === 0) return;
                setOrderOpen((value) => !value);
              }}
              className="w-full rounded-card border border-border-default bg-bg-elevated px-4 py-4 text-left transition duration-fast hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loadingOrders || orders.length === 0}
            >
              {selectedOrder ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-[15px] font-semibold text-text-primary">
                      <span>{selectedOrder.order_id}</span>
                      <span className="mx-2 text-text-muted">|</span>
                      <span>{getOrderPrimaryItem(selectedOrder).primary}</span>
                      {getOrderPrimaryItem(selectedOrder).extraCount > 0 ? (
                        <span className="ml-2 text-[12px] font-medium text-text-muted">
                          (+{getOrderPrimaryItem(selectedOrder).extraCount} more)
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusTone(selectedOrder.status)}`}>
                        {getOrderStatusLabel(selectedOrder)}
                      </span>
                      <div className="text-text-muted">
                        <ChevronIcon open={orderOpen} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    <span className="text-text-muted">|</span>
                    <span>{formatOrderDate(selectedOrder.created_at)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-text-muted">Select your order</span>
                  <div className="text-text-muted">
                    <ChevronIcon open={orderOpen} />
                  </div>
                </div>
              )}
            </button>

            {orderOpen && !loadingOrders && orders.length > 0 ? (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-card border border-border-default bg-bg-elevated shadow-lg">
                <div className="border-b border-border-default p-3">
                  <input
                    value={orderQuery}
                    onChange={(event) => setOrderQuery(event.target.value)}
                    autoFocus
                    placeholder="Search by order ID or product..."
                    className="h-10 w-full rounded-input border border-border-default bg-bg-sunken px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                </div>

                <div className="roar-scroll max-h-[280px] overflow-y-auto p-2">
                  {filteredOrders.map((order) => {
                    const itemSummary = getOrderPrimaryItem(order);
                    return (
                      <button
                        key={order.order_id}
                        type="button"
                        className="mb-2 w-full rounded-card border border-border-default bg-bg-surface px-3 py-3 text-left transition duration-fast enabled:hover:border-border-strong enabled:hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isOrderBlocked(order)}
                        onClick={() => {
                          setSelectedOrderId(order.order_id);
                          setOrderQuery('');
                          setOrderOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 text-[15px] font-semibold text-text-primary">
                            <span>{order.order_id}</span>
                            <span className="mx-2 text-text-muted">•</span>
                            <span>{itemSummary.primary}</span>
                            {itemSummary.extraCount > 0 ? (
                              <span className="ml-2 text-[12px] font-medium text-text-muted">
                                (+{itemSummary.extraCount} more)
                              </span>
                            ) : null}
                          </div>
                          <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusTone(order.status)}`}>
                            {getOrderStatusLabel(order)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                          <span>{formatCurrency(order.total_amount)}</span>
                          <span className="text-text-muted">•</span>
                          <span>{formatOrderDate(order.created_at)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredOrders.length === 0 ? (
                    <div className="px-3 py-3 text-[13px] text-text-muted">No matching orders found.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {errors.order_id ? <div className="mt-1 text-[12px] text-danger">{errors.order_id}</div> : null}
        </div>

        <div>
          <div className="mb-[6px] text-[13px] text-text-secondary">Step 2: What went wrong?</div>
          <div className="relative">
            <input
              value={selectedIssue ? selectedIssue.label : issueQuery}
              onChange={(event) => {
                setSelectedIssueId(null);
                setIssueQuery(event.target.value);
                setIssueOpen(true);
              }}
              onMouseDown={(event) => {
                if (issueOpen) {
                  event.preventDefault();
                  setIssueOpen(false);
                }
              }}
              onFocus={() => setIssueOpen(true)}
              placeholder="Search and select an issue type..."
              className="h-11 w-full rounded-input border border-border-default bg-bg-sunken px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:border-2 focus:bg-bg-elevated focus:outline-none"
            />
            {issueOpen ? (
              <div className="absolute z-20 mt-2 max-h-[280px] w-full overflow-y-auto rounded-input border border-border-default bg-bg-elevated shadow-2xl">
                {groupedIssues.map((group) => (
                  <div key={group.category}>
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="w-full border-b border-border-default px-3 py-2 text-left text-[13px] text-text-primary transition-colors duration-instant hover:bg-bg-sunken"
                        onClick={() => {
                          setSelectedIssueId(option.id);
                          setIssueQuery(option.label);
                          setIssueOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ))}
                {groupedIssues.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] text-text-muted">No matching issue types.</div>
                ) : null}
              </div>
            ) : null}
          </div>
          {errors.dispute_subtype ? <div className="mt-1 text-[12px] text-danger">{errors.dispute_subtype}</div> : null}
        </div>

        {selectedIssue?.resolutionOptions.length ? (
          <div>
            <div className="mb-[6px] text-[13px] text-text-secondary">Step 3: Requested resolution</div>
            <div className="flex flex-wrap gap-2">
              {selectedIssue.resolutionOptions.map((option) => {
                const label = option === 'refund' ? 'Refund' : option === 'replacement' ? 'Replacement' : 'Return';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setResolutionPreference(option)}
                    className={resolutionPreference === option
                      ? 'rounded-pill border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-text-inverse transition-colors duration-instant'
                      : 'rounded-pill border border-primary bg-primary/15 px-4 py-2 text-[13px] font-medium text-text-primary transition-colors duration-instant hover:bg-primary/25'
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.resolution_preference ? <div className="mt-1 text-[12px] text-danger">{errors.resolution_preference}</div> : null}
          </div>
        ) : null}

        {selectedIssue?.id === 'other' ? (
          <Textarea
            label="Please describe your issue"
            value={otherDetails}
            onChange={(event) => setOtherDetails(event.target.value)}
            error={errors.intake_message}
            rows={4}
            placeholder="Please describe what happened..."
          />
        ) : null}

        {apiError ? <div className="text-[13px] text-danger">{apiError}</div> : null}

        <Button type="submit" loading={loading} disabled={loadingOrders || orders.length === 0 || selectedOrderBlocked}>
          Submit
        </Button>
      </div>
    </form>
  );
}
