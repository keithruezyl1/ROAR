'use client';

import * as React from 'react';
import Link from 'next/link';

import { customerApi } from '@/lib/api';
import { CaseStatusPill } from '@/components/dashboard/CaseStatusPill';
import { DisputeTypeBadge } from '@/components/dashboard/DisputeTypeBadge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { logout } from '@/lib/auth';
import type { CaseStatus, DisputeType } from '@/types';

type CustomerCase = {
  id: string;
  reference_number: string;
  order_id: string;
  dispute_type: DisputeType;
  status: CaseStatus;
  updated_at: string;
};

const DOT_CLASS_BY_STATUS: Record<CaseStatus, string> = {
  pending_triage: 'bg-primary',
  awaiting_approval: 'bg-warning',
  approved_executing: 'bg-info',
  rejected_human_required: 'bg-danger',
  escalated_human_required: 'bg-info',
  resolved: 'bg-success',
  closed: 'bg-border-strong',
};

function formatUpdated(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EmptyIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      <rect x="14" y="12" width="44" height="48" rx="10" className="fill-primary-subtle" />
      <path d="M24 26H48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 36H48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 46H40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function CustomerCasesPage() {
  const [cases, setCases] = React.useState<CustomerCase[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadCases = React.useCallback(async () => {
    try {
      const response = await customerApi.getMyCases();
      setCases(response.cases as CustomerCase[]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCases();
    const intervalId = window.setInterval(() => void loadCases(), 10000);
    return () => window.clearInterval(intervalId);
  }, [loadCases]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="border-b border-border-default bg-bg-surface">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary text-text-inverse font-bold">
              R
            </div>
            <div className="text-[15px] font-semibold">ROAR Engine</div>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[980px] px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">My Cases</h1>
          </div>
          <Link href="/chat">
            <Button>Start New Dispute</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-card border border-border-default bg-bg-surface px-8 py-12 text-center">
            <div className="text-primary">
              <EmptyIllustration />
            </div>
            <div className="mt-6 text-[22px] font-semibold text-text-primary">No disputes yet</div>
            <div className="mt-2 max-w-[360px] text-[15px] text-text-secondary">
              If something went wrong with an order, we&apos;re here to help.
            </div>
            <Link href="/chat" className="mt-6">
              <Button>Start a dispute</Button>
            </Link>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-0 h-full w-px bg-border-default" />
            <div className="flex flex-col gap-6">
              {cases.map((customerCase) => (
                <div key={customerCase.id} className="relative">
                  <div className={`absolute left-[-29px] top-8 h-4 w-4 rounded-pill ring-4 ring-bg-base ${DOT_CLASS_BY_STATUS[customerCase.status]}`} />
                  <Link
                    href={`/chat?caseId=${customerCase.id}`}
                    className="block rounded-card border border-border-default bg-bg-surface p-5 transition duration-instant hover:border-border-focus hover:bg-primary-subtle"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <DisputeTypeBadge disputeType={customerCase.dispute_type} />
                      <CaseStatusPill status={customerCase.status} />
                    </div>
                    <div className="mt-4 font-mono text-[12px] text-text-secondary">{customerCase.reference_number}</div>
                    <div className="mt-2 text-[15px] text-text-secondary">Order {customerCase.order_id}</div>
                    <div className="mt-2 text-[11px] text-text-muted">Last updated {formatUpdated(customerCase.updated_at)}</div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

