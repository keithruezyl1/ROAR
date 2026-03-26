'use client';

import * as React from 'react';

import { api, customerApi } from '@/lib/api';
import { decodeToken } from '@/lib/auth';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Select';
import { Textarea } from '@/components/shared/Textarea';
import { INTAKE_ISSUE_OPTIONS, saveCaseContext } from '@/lib/intakeContext';
import type { CustomerOrder, DisputeType } from '@/types';

function formatOrderOption(order: CustomerOrder) {
  const createdAt = new Date(order.created_at).toLocaleDateString('en-TH');
  return `${order.order_id} - THB ${order.total_amount.toFixed(2)} - ${order.status} - ${createdAt}`;
}

export function IntakeForm({
  onCreated,
}: {
  onCreated: (v: { caseId: string; intakeReason: import('@/types').IntakeReason; disputeType: DisputeType }) => void;
}) {
  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(true);
  const [selectedIssue, setSelectedIssue] = React.useState<string>(INTAKE_ISSUE_OPTIONS[0].label);
  const [selectedOrderId, setSelectedOrderId] = React.useState('');
  const [customDisputeType, setCustomDisputeType] = React.useState<DisputeType>('refund');
  const [freeformDetails, setFreeformDetails] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState('');

  const selectedOption = React.useMemo(
    () => INTAKE_ISSUE_OPTIONS.find((option) => option.label === selectedIssue) ?? INTAKE_ISSUE_OPTIONS[0],
    [selectedIssue]
  );

  React.useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      try {
        const res = await customerApi.getMyOrders();
        if (cancelled) return;
        setOrders(res.orders);
        if (res.orders.length > 0) {
          setSelectedOrderId((current) => current || res.orders[0].order_id);
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'Unable to load your orders.');
        }
      } finally {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      }
    };

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!selectedOrderId) {
      nextErrors.order_id = 'Please select an order.';
    }

    if (selectedOption.requiresFreeform && freeformDetails.trim().length < 10) {
      nextErrors.intake_message = 'Please describe your issue in at least 10 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload = decodeToken();
    if (!payload?.email || !payload.full_name) {
      setApiError('Your session is missing customer identity details. Please log in again.');
      return;
    }

    const disputeType = selectedOption.disputeType ?? customDisputeType;
    const intakeReason = selectedOption.disputeType ? selectedOption.intakeReason : customDisputeType === 'refund' ? 'other_refund' : 'other_delivery';
    const intakeMessage = selectedOption.requiresFreeform ? freeformDetails.trim() : selectedOption.label;

    try {
      setLoading(true);
      const res = await api.post<{ id: string }>(`/cases`, {
        order_id: selectedOrderId,
        dispute_type: disputeType,
        customer_name: payload.full_name,
        customer_email: payload.email,
        intake_message: intakeMessage,
      });
      saveCaseContext(res.id, { intakeReason, disputeType });
      onCreated({ caseId: res.id, intakeReason, disputeType });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full rounded-card border border-border-default bg-bg-surface p-6">
      <div className="mb-4">
        <div className="text-[24px] font-bold">Start a case</div>
        <div className="mt-2 text-[13px] text-text-secondary">Submit your dispute and chat with ROAR.</div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-[6px] text-[13px] text-text-secondary">What best describes your issue?</div>
          <div className="flex flex-wrap gap-2">
            {INTAKE_ISSUE_OPTIONS.map((option) => {
              const selected = option.label === selectedIssue;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setSelectedIssue(option.label)}
                  className={selected
                    ? 'rounded-pill border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-text-inverse transition-colors duration-instant'
                    : 'rounded-pill border border-primary px-4 py-2 text-[13px] font-medium text-text-primary transition-colors duration-instant bg-primary/15 hover:bg-primary/25'
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <Select
          label="Order"
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          error={errors.order_id}
          disabled={loadingOrders || orders.length === 0}
        >
          {orders.length === 0 ? <option value="">No orders available</option> : null}
          {orders.map((order) => (
            <option key={order.order_id} value={order.order_id}>
              {formatOrderOption(order)}
            </option>
          ))}
        </Select>

        {selectedOption.requiresFreeform ? (
          <>
            <Textarea
              label="Please describe your issue"
              value={freeformDetails}
              onChange={(e) => setFreeformDetails(e.target.value)}
              error={errors.intake_message}
              rows={4}
              placeholder="Please describe what happened..."
            />

            <div>
              <div className="mb-[6px] text-[13px] text-text-secondary">Dispute type</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCustomDisputeType('refund')}
                  className={customDisputeType === 'refund'
                    ? 'rounded-pill border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-text-inverse transition-colors duration-instant'
                    : 'rounded-pill border border-primary px-4 py-2 text-[13px] font-medium text-text-primary transition-colors duration-instant bg-primary/15 hover:bg-primary/25'
                  }
                >
                  Refund
                </button>
                <button
                  type="button"
                  onClick={() => setCustomDisputeType('delivery')}
                  className={customDisputeType === 'delivery'
                    ? 'rounded-pill border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-text-inverse transition-colors duration-instant'
                    : 'rounded-pill border border-primary px-4 py-2 text-[13px] font-medium text-text-primary transition-colors duration-instant bg-primary/15 hover:bg-primary/25'
                  }
                >
                  Delivery
                </button>
              </div>
            </div>
          </>
        ) : null}

        {apiError ? <div className="text-[13px] text-danger">{apiError}</div> : null}

        <Button type="submit" loading={loading} disabled={loadingOrders || orders.length === 0}>
          Submit
        </Button>
      </div>
    </form>
  );
}
