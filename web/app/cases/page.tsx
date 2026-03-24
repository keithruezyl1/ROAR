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

type CustomerCase = {
  id: string;
  reference_number: string;
  order_id: string;
  dispute_type: 'refund' | 'delivery';
  customer_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CustomerCasesPage() {
  const [cases, setCases] = React.useState<CustomerCase[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    customerApi.getMyCases().then((res) => {
      setCases(res.cases as CustomerCase[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-surface">
        <div className="mx-auto flex max-w-[880px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary text-text-inverse font-bold">
              R
            </div>
            <div>
              <div className="text-[15px] font-semibold">ROAR Engine</div>
              <div className="text-[11px] text-text-muted">My Disputes</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Link href="/chat">
              <Button size="sm">New Dispute</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[880px] px-6 py-8">
        <h1 className="text-[24px] font-bold">My Cases</h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          View and track your active and closed disputes.
        </p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : cases.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-[15px] text-text-muted">No disputes yet.</div>
            <Link href="/chat" className="mt-4 inline-block">
              <Button size="sm">Start your first dispute</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/chat?caseId=${c.id}`}
                className="block rounded-card border border-border-default bg-bg-surface p-5 transition duration-instant hover:border-border-focus hover:bg-primary-subtle"
              >
                <div className="flex items-start justify-between">
                  <DisputeTypeBadge disputeType={c.dispute_type} />
                  <CaseStatusPill status={c.status} />
                </div>
                <div className="mt-3 font-mono text-[12px] text-text-secondary">
                  {c.reference_number}
                </div>
                <div className="mt-1 text-[15px] font-semibold text-text-primary">
                  Order {c.order_id}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[11px] text-text-muted">
                    Updated {timeAgo(c.updated_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
