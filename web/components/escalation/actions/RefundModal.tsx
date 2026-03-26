'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Textarea } from '@/components/shared/Textarea';

export function RefundModal({
  open,
  onClose,
  mode,
  caseId,
  orderId,
  transactionAmount,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'full' | 'partial';
  caseId: string;
  orderId: string;
  transactionAmount: number | null;
  onSuccess: () => Promise<void> | void;
}) {
  const [amount, setAmount] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    const defaultAmount = transactionAmount != null ? String(transactionAmount) : '';
    setAmount(defaultAmount);
    setReason('');
  }, [open, transactionAmount]);

  const onSubmit = async () => {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid refund amount.');
      return;
    }
    if (reason.trim().length < 1) {
      setError('Reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post<unknown>('/refund_requests', {
        case_id: caseId,
        order_id: orderId,
        amount: amt,
        reason: reason.trim(),
      });
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refund request failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={mode === 'full' ? 'Create Full Refund' : 'Create Partial Refund'}
    >
      <div className="flex flex-col gap-4">
        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <Input
          label="Refund Amount (THB)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
        />

        <Textarea
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          rows={4}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void onSubmit()} disabled={submitting}>
            Create refund
          </Button>
        </div>
      </div>
    </Modal>
  );
}

