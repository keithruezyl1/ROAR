'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { customerApi } from '@/lib/api';
import { CaseStatusPill } from '@/components/dashboard/CaseStatusPill';
import { DisputeTypeBadge } from '@/components/dashboard/DisputeTypeBadge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { Modal } from '@/components/shared/Modal';
import { decodeToken, logout } from '@/lib/auth';
import type { CaseStatus, DisputeType, ResolutionPreference } from '@/types';

type CustomerCase = {
  id: string;
  reference_number: string;
  order_id: string;
  dispute_type: DisputeType;
  resolution_preference: ResolutionPreference | null;
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CustomerCasesPage() {
  const [cases, setCases] = React.useState<CustomerCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [expandedCaseIds, setExpandedCaseIds] = React.useState<Set<string>>(new Set());

  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const fullName = React.useMemo(() => {
    const payload = decodeToken();
    return payload?.full_name ?? 'Customer';
  }, []);

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

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const toggleCaseDetails = React.useCallback((caseId: string) => {
    setExpandedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="border-b border-border-default bg-bg-surface">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/roar-logo.png" alt="ROAR logo" width={36} height={36} className="h-9 w-9 rounded-btn object-cover" />
            <div>
              <div className="text-[15px] font-semibold">ROAR Engine</div>
              <div className="-mt-0.5 text-[13px] leading-none text-text-muted">Customer Dashboard</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DarkModeToggle />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-9 items-center gap-2 rounded-pill border border-border-default bg-bg-elevated px-2 pr-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-sunken"
              >
                <Image src="/customerpfp.jpg" alt="Customer profile" width={22} height={22} className="h-[22px] w-[22px] rounded-pill object-cover" />
                <span>{fullName}</span>
                <ChevronDownIcon />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-[160px] rounded-btn border border-border-default bg-bg-elevated p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setLogoutOpen(true);
                    }}
                    className="w-full rounded-btn px-3 py-2 text-left text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-sunken hover:text-text-primary"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[980px] px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">My Cases</h1>
          </div>
          <Link href="/chat">
            <Button>+ New Dispute</Button>
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
              {cases.map((customerCase) => {
                const detailsOpen = expandedCaseIds.has(customerCase.id);
                const typeTitle = customerCase.resolution_preference ? 'Requested resolution' : 'Issue type';
                const typeValue = customerCase.resolution_preference ?? customerCase.dispute_type;

                return (
                  <div key={customerCase.id} className="relative">
                    <div className={`absolute left-[-29px] top-8 h-4 w-4 rounded-pill ring-4 ring-bg-base ${DOT_CLASS_BY_STATUS[customerCase.status]}`} />

                    <div className="rounded-card border border-border-default bg-bg-surface p-5 transition duration-instant hover:border-border-focus">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <DisputeTypeBadge disputeType={customerCase.dispute_type} />
                              <CaseStatusPill status={customerCase.status} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="font-mono text-[12px] text-text-secondary">{customerCase.reference_number}</div>
                              <div className="text-[16px] font-medium text-text-primary">Order {customerCase.order_id}</div>
                              <div className="text-[11px] text-text-muted">Last updated {formatUpdated(customerCase.updated_at)}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 md:flex-col md:items-end">
                            <Link href={`/chat?caseId=${customerCase.id}`}>
                              <Button size="sm">Open chat</Button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleCaseDetails(customerCase.id)}
                              className="inline-flex items-center gap-1 rounded-pill border border-border-default bg-bg-elevated px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-sunken"
                              aria-expanded={detailsOpen}
                            >
                              Case details
                              <ChevronDownIcon className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {detailsOpen ? (
                          <div className="grid gap-2 border-t border-border-default pt-4 sm:grid-cols-2">
                            <div className="rounded-btn bg-bg-sunken px-3 py-2">
                              <div className="text-[11px] text-text-muted">Case ID</div>
                              <div className="mt-1 font-mono text-[12px] text-text-primary">{customerCase.id}</div>
                            </div>
                            <div className="rounded-btn bg-bg-sunken px-3 py-2">
                              <div className="text-[11px] text-text-muted">Reference</div>
                              <div className="mt-1 font-mono text-[12px] text-text-primary">{customerCase.reference_number}</div>
                            </div>
                            <div className="rounded-btn bg-bg-sunken px-3 py-2">
                              <div className="text-[11px] text-text-muted">Order</div>
                              <div className="mt-1 text-[13px] text-text-primary">{customerCase.order_id}</div>
                            </div>
                            <div className="rounded-btn bg-bg-sunken px-3 py-2">
                              <div className="text-[11px] text-text-muted">{typeTitle}</div>
                              <div className="mt-1 text-[13px] capitalize text-text-primary">{typeValue}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log out now?"
      >
        <div className="flex flex-col gap-5">
          <p className="text-[14px] text-text-secondary">
            You will be signed out of ROAR Engine. You can log back in any time.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
              Go back
            </Button>
            <Button variant="primary" onClick={logout}>
              Yes, log out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


