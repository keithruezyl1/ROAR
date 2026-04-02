'use client';

import * as React from 'react';

import { AGENT_CLOSE_REASONS } from '@/lib/constants';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { Select } from '@/components/shared/Select';

type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';

function isCloseReason(value: string): value is CloseReason {
  return value === 'resolved' || value === 'unresponsive' || value === 'duplicate';
}

export function ConversationClosePanel({
  onConfirm,
  requireFinalConfirmation = false,
}: {
  onConfirm: (reason: CloseReason) => Promise<void> | void;
  requireFinalConfirmation?: boolean;
}) {
  const [reason, setReason] = React.useState<string>('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedReasonLabel = AGENT_CLOSE_REASONS.find((r) => r.value === reason)?.label ?? reason;

  const submitClose = React.useCallback(async () => {
    if (!isCloseReason(reason)) return;
    setSubmitting(true);
    try {
      await onConfirm(reason);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm, reason]);

  return (
    <>
      <div className="rounded-card border border-border-default bg-bg-surface p-4">
        <div className="text-[13px] font-medium text-text-secondary">Close conversation</div>
        <div className="mt-3">
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason...</option>
            {AGENT_CLOSE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            disabled={!isCloseReason(reason) || submitting}
            loading={submitting}
            onClick={() => {
              if (!isCloseReason(reason)) return;
              if (requireFinalConfirmation) {
                setConfirmOpen(true);
                return;
              }
              void submitClose();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        title="Confirm conversation close"
      >
        <div className="flex flex-col gap-4">
          <div className="text-[14px] text-text-secondary">
            This will close the active conversation immediately.
          </div>
          <div className="rounded-btn border border-border-default bg-bg-sunken px-3 py-2 text-[13px] text-text-primary">
            Reason: <span className="font-medium">{selectedReasonLabel}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" loading={submitting} disabled={submitting} onClick={() => void submitClose()}>
              Yes, close conversation
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
