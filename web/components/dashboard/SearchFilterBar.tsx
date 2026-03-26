'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';

export type Filters = {
  search: string;
  dispute_type: '' | 'refund' | 'delivery';
  status: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchFilterBar({
  value,
  onChange,
  statusOptions,
  resultsCount,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  statusOptions: Array<{ value: string; label: string }>;
  resultsCount?: number;
}) {
  const [draft, setDraft] = React.useState(value.search);

  React.useEffect(() => {
    setDraft(value.search);
  }, [value.search]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (draft !== value.search) {
        onChange({ ...value, search: draft });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [draft, onChange, value]);

  const clearActive = value.search || value.dispute_type || value.status;
  const searchLabel = resultsCount && resultsCount > 0 ? `Search cases (${resultsCount})` : 'Search cases';

  return (
    <div className="mt-4 rounded-card border border-border-default bg-bg-surface p-3 md:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <label className="flex-1">
          <div className="mb-1 text-[12px] font-medium text-text-muted">{searchLabel}</div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <SearchIcon />
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Case ID, order ID, or customer name"
              className="h-11 w-full rounded-input border border-border-default bg-bg-elevated pl-10 pr-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-2 focus:border-border-focus focus:outline-none"
            />
          </div>
        </label>

        <label className="min-w-[180px]">
          <div className="mb-1 text-[12px] font-medium text-text-muted">Type</div>
          <div className="relative">
            <select
              value={value.dispute_type}
              onChange={(e) =>
                onChange({
                  ...value,
                  dispute_type: e.target.value === 'refund' || e.target.value === 'delivery' ? e.target.value : '',
                })
              }
              className="h-11 w-full appearance-none rounded-input border border-border-default bg-bg-elevated px-3 pr-10 text-[15px] text-text-primary"
            >
              <option value="">All types</option>
              <option value="refund">Refund</option>
              <option value="delivery">Delivery</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-secondary">
              <ChevronDownIcon />
            </span>
          </div>
        </label>

        <label className="min-w-[220px]">
          <div className="mb-1 text-[12px] font-medium text-text-muted">Status</div>
          <div className="relative">
            <select
              value={value.status}
              onChange={(e) => onChange({ ...value, status: e.target.value })}
              className="h-11 w-full appearance-none rounded-input border border-border-default bg-bg-elevated px-3 pr-10 text-[15px] text-text-primary"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-secondary">
              <ChevronDownIcon />
            </span>
          </div>
        </label>

        {clearActive ? (
          <Button
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => onChange({ search: '', dispute_type: '', status: '' })}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

