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
        'block rounded-card border border-border-default bg-bg-surface p-5 transition duration-instant',
        'hover:border-border-focus hover:bg-primary-subtle'
      )}
    >
      <div className="flex items-start justify-between">
        <DisputeTypeBadge disputeType={c.dispute_type} />
        <CaseStatusPill status={c.status} />
      </div>

      <div className="mt-4 font-mono text-[12px] text-text-secondary">{c.reference_number}</div>
      <div className="mt-2 text-[17px] font-semibold text-text-primary">{c.customer_name}</div>
      <div className="mt-1 text-[13px] text-text-secondary">Order {c.order_id}</div>
      <div className="mt-3 text-[11px] text-text-muted">Time in queue: {timeInQueue(c.created_at)}</div>
    </Link>
  );
}
