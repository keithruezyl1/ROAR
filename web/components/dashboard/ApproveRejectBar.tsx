'use client';

import { Button } from '@/components/shared/Button';

export function ApproveRejectBar({
  referenceNumber,
  onApprove,
  onReject,
  loading,
  message,
}: {
  referenceNumber: string;
  onApprove: () => void;
  onReject: () => void;
  loading?: 'approve' | 'reject' | null;
  message?: string;
}) {
  return (
    <div className="sticky bottom-0 mt-4 flex h-16 items-center justify-between border-t border-border-default bg-bg-elevated px-6">
      <div className="font-mono text-[12px] text-text-secondary">{referenceNumber}</div>
      {message ? (
        <div className="text-[13px] text-text-secondary">{message}</div>
      ) : (
        <div className="flex gap-3">
          <Button variant="danger" loading={loading === 'reject'} onClick={onReject}>
            Reject
          </Button>
          <Button variant="primary" loading={loading === 'approve'} onClick={onApprove}>
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}
