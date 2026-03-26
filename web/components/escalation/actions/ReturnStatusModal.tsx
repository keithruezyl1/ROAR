'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';

export function ReturnStatusModal({
  open,
  onClose,
  mode,
  returnRequestId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'approved' | 'rejected';
  returnRequestId: string | null;
  onSuccess: () => Promise<void> | void;
}) {
  const [reason, setReason] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
    setSubmitting(false);
  }, [open, mode]);

  const onSubmit = async () => {
    setError(null);

    if (!returnRequestId) {
      setError('No return request selected.');
      return;
    }

    if (mode === 'rejected' && reason.trim().length < 1) {
      setError('Please provide a rejection reason.');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch<unknown>(`/return_requests/${returnRequestId}`, {
        status: mode,
        reason: mode === 'rejected' ? reason.trim() : undefined,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update return request.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={mode === 'approved' ? 'Approve Return Request' : 'Reject Return Request'}
    >
      <div className="flex flex-col gap-4">
        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        {mode === 'approved' ? (
          <div className="text-[14px] text-text-primary">
            Approving this return request will update the case records and notify the customer.
          </div>
        ) : (
          <div className="text-[14px] text-text-primary">
            Rejecting this return request will update the case records and notify the customer.
          </div>
        )}

        {mode === 'rejected' ? (
          <Textarea
            label="Rejection Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            rows={4}
          />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void onSubmit()} disabled={submitting}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

