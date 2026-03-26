'use client';

import Link from 'next/link';
import clsx from 'clsx';

import { CaseStatusPill } from './CaseStatusPill';
import { DisputeTypeBadge } from './DisputeTypeBadge';

export type CaseCardVariant = 'approval' | 'escalation';

export type CaseCardModel = {
  id: string;
  reference_number: string;
  status: string;
  dispute_type: 'refund' | 'delivery';
  customer_name: string;
  order_id: string;
  created_at: string;
};

function timeInQueue(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);

  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatCreated(createdAt: string) {
  return new Date(createdAt).toLocaleString('en-TH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CaseCard({
  variant,
  c,
}: {
  variant: CaseCardVariant;
  c: CaseCardModel;
}) {
  const href = variant === 'approval' ? `/approver/${c.id}` : `/escalation/${c.id}`;

  return (
    <Link
      href={href}
      className={clsx(
        'group block rounded-card border border-border-default bg-bg-surface p-4 transition duration-instant',
        'hover:border-border-focus hover:bg-bg-elevated'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold text-text-primary">{c.customer_name}</div>
          <div className="mt-1 font-mono text-[12px] text-text-secondary">{c.reference_number}</div>
        </div>
        <CaseStatusPill status={c.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div className="rounded-btn bg-bg-sunken px-3 py-2">
          <div className="text-text-muted">Order</div>
          <div className="mt-1 font-mono text-text-secondary">{c.order_id}</div>
        </div>
        <div className="rounded-btn bg-bg-sunken px-3 py-2">
          <div className="text-text-muted">In queue</div>
          <div className="mt-1 font-semibold text-text-secondary">{timeInQueue(c.created_at)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <DisputeTypeBadge disputeType={c.dispute_type} />
        <div className="text-[11px] text-text-muted">Opened {formatCreated(c.created_at)}</div>
      </div>

      <div className="mt-3 text-[13px] font-medium text-primary transition-colors group-hover:text-primary-hover">
        {variant === 'approval' ? 'Review case ->' : 'Open case ->'}
      </div>
    </Link>
  );
}
