'use client';

import * as React from 'react';

import { AGENT_CLOSE_REASONS } from '@/lib/constants';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Select';

type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';

function isCloseReason(value: string): value is CloseReason {
  return value === 'resolved' || value === 'unresponsive' || value === 'duplicate';
}

export function ConversationClosePanel({
  onConfirm,
}: {
  onConfirm: (reason: CloseReason) => Promise<void> | void;
}) {
  const [reason, setReason] = React.useState<string>('');

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-4">
      <div className="text-[13px] font-medium text-text-secondary">Close conversation</div>
      <div className="mt-3">
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason…</option>
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
          disabled={!isCloseReason(reason)}
          onClick={() => {
            if (isCloseReason(reason)) {
              void onConfirm(reason);
            }
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
