'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Textarea } from '@/components/shared/Textarea';

export function DenyRefundModal({
  open,
  onClose,
  caseId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess: () => Promise<void> | void;
}) {
  const [reason, setReason] = React.useState<string>('');
  const [policySlug, setPolicySlug] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setReason('');
    setPolicySlug('');
  }, [open]);

  const onSubmit = async () => {
    setError(null);

    if (reason.trim().length < 10) {
      setError('Please provide a denial reason (at least 10 characters).');
      return;
    }

    try {
      setSubmitting(true);
      await api.post<unknown>(`/cases/${caseId}/deny-refund`, {
        reason: reason.trim(),
        policy_slug: policySlug.trim() ? policySlug.trim() : undefined,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to deny refund.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Deny Refund">
      <div className="flex flex-col gap-4">
        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <Textarea
          label="Denial Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          rows={4}
        />

        <Input
          label="Optional Policy Slug"
          value={policySlug}
          onChange={(e) => setPolicySlug(e.target.value)}
          disabled={submitting}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" loading={submitting} onClick={() => void onSubmit()} disabled={submitting}>
            Deny refund
          </Button>
        </div>
      </div>
    </Modal>
  );
}

