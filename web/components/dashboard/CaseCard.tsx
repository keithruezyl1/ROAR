'use client';

import Link from 'next/link';
import clsx from 'clsx';

import { CaseStatusPill } from './CaseStatusPill';
import { DisputeTypeBadge } from './DisputeTypeBadge';
import { Button } from '@/components/shared/Button';

export type CaseCardVariant = 'approval' | 'escalation';

export type CaseCardModel = {
  id: string;
  reference_number: string;
  status: string;
  dispute_type: 'refund' | 'delivery';
  resolution_preference?: 'refund' | 'replacement' | 'return' | null;
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

function queueAgeMins(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function queueTone(createdAt: string) {
  const mins = queueAgeMins(createdAt);
  if (mins >= 60) return { label: 'High', bg: 'bg-danger-bg', text: 'text-danger' };
  if (mins >= 15) return { label: 'Medium', bg: 'bg-warning-bg', text: 'text-warning' };
  return { label: 'Low', bg: 'bg-success-bg', text: 'text-success' };
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
  const queue = queueTone(c.created_at);
  const showResolutionBadge = Boolean(c.resolution_preference);

  return (
    <article
      className={clsx(
        'group rounded-card border border-border-default bg-bg-surface p-4 transition duration-instant',
        'hover:border-border-focus hover:bg-bg-elevated',
        variant === 'escalation' ? 'shadow-[inset_3px_0_0_0_rgba(96,165,250,0.5)]' : 'shadow-[inset_3px_0_0_0_rgba(245,158,11,0.5)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold text-text-primary">{c.customer_name}</div>
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
          <div className="flex items-center justify-between">
            <span className="text-text-muted">In queue</span>
            <span className={clsx('rounded-pill px-2 py-[2px] text-[10px] font-medium', queue.bg, queue.text)}>
              {queue.label}
            </span>
          </div>
          <div className="mt-1 font-semibold text-text-secondary">{timeInQueue(c.created_at)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {showResolutionBadge ? (
          c.resolution_preference === 'replacement' ? (
            <span className="inline-flex items-center rounded-pill bg-success-bg px-2 py-[3px] text-[11px] font-medium text-success">Replacement</span>
          ) : c.resolution_preference === 'return' ? (
            <span className="inline-flex items-center rounded-pill bg-warning-bg px-2 py-[3px] text-[11px] font-medium text-warning">Return</span>
          ) : (
            <span className="inline-flex items-center rounded-pill bg-primary-subtle px-2 py-[3px] text-[11px] font-medium text-primary">
              Refund
            </span>
          )
        ) : (
          <DisputeTypeBadge disputeType={c.dispute_type} />
        )}
        <div className="text-[11px] text-text-muted">Opened {formatCreated(c.created_at)}</div>
      </div>

      <div className="mt-4">
        <Link href={href} className="inline-flex">
          <Button size="sm" variant={variant === 'escalation' ? 'primary' : 'secondary'}>
            {variant === 'approval' ? 'Review case' : 'Open case'}
          </Button>
        </Link>
      </div>
    </article>
  );
}
