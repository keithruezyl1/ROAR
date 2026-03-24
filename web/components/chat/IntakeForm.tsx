'use client';

import * as React from 'react';

import { api, customerApi } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Textarea } from '@/components/shared/Textarea';
import type { CustomerOrder } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DisputeType = 'refund' | 'delivery';

export function IntakeForm({
  onCreated,
}: {
  onCreated: (v: { caseId: string; referenceNumber: string; disputeType: DisputeType }) => void;
}) {
  const isLoggedIn = !!getToken();
  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);

  const [orderId, setOrderId] = React.useState('');
  const [disputeType, setDisputeType] = React.useState<DisputeType>('refund');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [intakeMessage, setIntakeMessage] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState('');

  React.useEffect(() => {
    if (!isLoggedIn) return;
    customerApi.getMyOrders().then((res) => {
      setOrders(res.orders);
      if (res.orders.length > 0) setOrderId(res.orders[0].order_id);
    }).catch(() => {});
  }, [isLoggedIn]);

  const validate = () => {
    const e: Record<string, string> = {};

    if (!orderId.trim() || orderId.length > 50) e.order_id = 'Please enter a valid order ID.';
    if (disputeType !== 'refund' && disputeType !== 'delivery') e.dispute_type = 'Please select a dispute type.';
    if (!isLoggedIn) {
      if (customerName.trim().length < 2 || customerName.trim().length > 100) e.customer_name = 'Please enter your full name.';
      if (!customerEmail.trim() || customerEmail.length > 200 || !EMAIL_RE.test(customerEmail)) e.customer_email = 'Please enter a valid email address.';
    }
    if (intakeMessage.trim().length < 10 || intakeMessage.trim().length > 1000) e.intake_message = 'Please describe your issue (minimum 10 characters).';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const body: Record<string, string> = {
        order_id: orderId,
        dispute_type: disputeType,
        intake_message: intakeMessage,
      };
      if (!isLoggedIn) {
        body.customer_name = customerName;
        body.customer_email = customerEmail;
      } else {
        body.customer_name = 'Customer';
        body.customer_email = 'customer@demo.com';
      }

      const res = await api.post<{ id: string; reference_number: string; status: string }>('/cases', body);

      onCreated({ caseId: res.id, referenceNumber: res.reference_number, disputeType });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create case');
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
        {/* Order selection — dropdown if logged in, text input if anonymous */}
        {isLoggedIn && orders.length > 0 ? (
          <Select label="Order" value={orderId} onChange={(e) => setOrderId(e.target.value)} error={errors.order_id}>
            {orders.map((o) => (
              <option key={o.order_id} value={o.order_id}>
                {o.order_id} — ฿{o.total_amount.toLocaleString()} ({o.status})
              </option>
            ))}
          </Select>
        ) : (
          <Input label="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} error={errors.order_id} />
        )}

        {/* Dispute type — chip selector */}
        <div>
          <div className="mb-[6px] text-[13px] text-text-secondary">Dispute type</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDisputeType('refund')}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-medium transition-colors duration-instant ${
                disputeType === 'refund'
                  ? 'bg-primary text-text-inverse'
                  : 'border border-border-default bg-bg-sunken text-text-secondary hover:border-border-strong'
              }`}
            >
              ↩ Refund
            </button>
            <button
              type="button"
              onClick={() => setDisputeType('delivery')}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-medium transition-colors duration-instant ${
                disputeType === 'delivery'
                  ? 'bg-primary text-text-inverse'
                  : 'border border-border-default bg-bg-sunken text-text-secondary hover:border-border-strong'
              }`}
            >
              📦 Delivery
            </button>
          </div>
          {errors.dispute_type ? <div className="mt-1 text-[13px] text-danger">{errors.dispute_type}</div> : null}
        </div>

        {/* Name/email — only if not logged in */}
        {!isLoggedIn && (
          <>
            <Input
              label="Full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              error={errors.customer_name}
            />
            <Input
              label="Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              error={errors.customer_email}
            />
          </>
        )}

        <Textarea
          label="What happened?"
          value={intakeMessage}
          onChange={(e) => setIntakeMessage(e.target.value)}
          error={errors.intake_message}
          rows={4}
        />

        {apiError ? <div className="text-[13px] text-danger">{apiError}</div> : null}

        <Button type="submit" loading={loading}>
          Submit
        </Button>
      </div>
    </form>
  );
}
