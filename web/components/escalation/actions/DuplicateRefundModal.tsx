'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';

export function DuplicateRefundModal({
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
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setError(null);
  }, [open]);

  const confirm = async () => {
    setError(null);
    try {
      setSubmitting(true);
      await api.post<unknown>(`/cases/${caseId}/mark-duplicate-refund`);
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Duplicate action failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Mark Duplicate / Already Refunded">
      <div className="flex flex-col gap-4">
        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <div className="text-[14px] text-text-primary">
          Confirm that this refund is a duplicate (already refunded or refund in process). No new refund request will be created.
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void confirm()} disabled={submitting}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

