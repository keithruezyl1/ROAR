'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';

export type Filters = {
  search: string;
  dispute_type: '' | 'refund' | 'delivery';
  status: string;
};

export function SearchFilterBar({
  value,
  onChange,
  statusOptions,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  statusOptions: Array<{ value: string; label: string }>;
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
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [draft, onChange, value]);

  const clearActive = value.search || value.dispute_type || value.status;

  return (
    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search by case ID, order ID, or customer name..."
        className="h-10 w-full flex-1 rounded-input border border-border-default bg-bg-sunken px-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-2 focus:border-border-focus focus:bg-bg-elevated focus:outline-none"
      />

      <select
        value={value.dispute_type}
        onChange={(e) =>
          onChange({
            ...value,
            dispute_type: e.target.value === 'refund' || e.target.value === 'delivery' ? e.target.value : '',
          })
        }
        className="h-10 rounded-input border border-border-default bg-bg-sunken px-3 text-[15px] text-text-primary"
      >
        <option value="">All types</option>
        <option value="refund">Refund</option>
        <option value="delivery">Delivery</option>
      </select>

      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
        className="h-10 rounded-input border border-border-default bg-bg-sunken px-3 text-[15px] text-text-primary"
      >
        <option value="">All statuses</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {clearActive ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange({ search: '', dispute_type: '', status: '' })}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
