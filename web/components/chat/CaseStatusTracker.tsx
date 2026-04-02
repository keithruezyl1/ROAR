'use client';

import * as React from 'react';
import clsx from 'clsx';

import { CASE_STATUS_LABELS } from '@/lib/constants';

const AUTONOMOUS_STEPS: Array<{ key: string; label: string }> = [
  { key: 'pending_triage', label: CASE_STATUS_LABELS.pending_triage },
  { key: 'awaiting_customer_proof', label: CASE_STATUS_LABELS.awaiting_customer_proof },
  { key: 'awaiting_customer_decision', label: CASE_STATUS_LABELS.awaiting_customer_decision },
  { key: 'awaiting_approval', label: CASE_STATUS_LABELS.awaiting_approval },
  { key: 'approved_executing', label: CASE_STATUS_LABELS.approved_executing },
  { key: 'resolved', label: CASE_STATUS_LABELS.resolved },
  { key: 'closed', label: CASE_STATUS_LABELS.closed },
];

const ESCALATION_STEPS: Array<{ key: string; label: string }> = [
  { key: 'pending_triage', label: CASE_STATUS_LABELS.pending_triage },
  { key: 'awaiting_customer_decision', label: CASE_STATUS_LABELS.awaiting_customer_decision },
  { key: 'escalated_human_required', label: CASE_STATUS_LABELS.escalated_human_required },
  { key: 'closed', label: CASE_STATUS_LABELS.closed },
];

const REJECTED_STEPS: Array<{ key: string; label: string }> = [
  { key: 'awaiting_approval', label: CASE_STATUS_LABELS.awaiting_approval },
  { key: 'rejected_human_required', label: CASE_STATUS_LABELS.rejected_human_required },
  { key: 'closed', label: CASE_STATUS_LABELS.closed },
];

export function CaseStatusTracker({
  status,
  updatedAt,
  defaultExpanded = false,
}: {
  status: string;
  updatedAt?: string;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultExpanded);
  const steps = React.useMemo(() => {
    if (status === 'escalated_human_required') return ESCALATION_STEPS;
    if (status === 'rejected_human_required') return REJECTED_STEPS;
    return AUTONOMOUS_STEPS;
  }, [status]);
  const activeIndex = Math.max(0, steps.findIndex((s) => s.key === status));

  return (
    <div className="border-b border-border-default bg-bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
        aria-label="Toggle case status tracker"
      >
        <div>
          <div className="text-[13px] font-medium text-text-secondary">Case status</div>
          <div className="mt-1 text-[15px] font-semibold text-text-primary">{CASE_STATUS_LABELS[status] ?? status}</div>
        </div>
        <div className="text-[13px] text-text-muted">{open ? 'Hide' : 'Show'}</div>
      </button>

      {open ? (
        <div className="px-4 pb-4">
          <div className="flex flex-col gap-2">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={clsx(
                    'h-2 w-2 rounded-pill',
                    idx <= activeIndex ? 'bg-primary' : 'bg-border-default'
                  )}
                />
                <div className={clsx('text-[13px]', idx === activeIndex ? 'text-text-primary' : 'text-text-secondary')}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {updatedAt ? (
            <div className="mt-3 text-[11px] text-text-muted">Last updated: {new Date(updatedAt).toLocaleString()}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
