'use client';

import * as React from 'react';

import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';
import { Input } from '@/components/shared/Input';
import { api } from '@/lib/api';
import { BUSINESS_RULES } from '@/lib/constants';
import { PolicyCitationChip } from './PolicyCitationChip';

type Policy = {
  id: string;
  title: string;
  slug: string;
  category: string;
};

export function RejectionModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: { reason: string; policyRefs: string[] }) => Promise<void> | void;
}) {
  const [reason, setReason] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [selected, setSelected] = React.useState<Policy[]>([]);

  React.useEffect(() => {
    if (!open) return;
    void api.get<Policy[]>('/policies').then(setPolicies).catch(() => setPolicies([]));
  }, [open]);

  const filtered = policies.filter((policy) => {
    const q = search.toLowerCase();
    return !q || policy.title.toLowerCase().includes(q) || policy.slug.toLowerCase().includes(q);
  });

  const canConfirm = reason.trim().length >= BUSINESS_RULES.MIN_REJECTION_REASON_CHARS;

  return (
    <Modal open={open} onClose={onClose} title="Reject plan" wide>
      <div className="flex flex-col gap-4">
        <Textarea
          label={`Rejection reason (${reason.trim().length}/${BUSINESS_RULES.MIN_REJECTION_REASON_CHARS})`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
        />

        <Input label="Search policies" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="max-h-[180px] overflow-y-auto rounded-input border border-border-default bg-bg-sunken">
          {filtered.slice(0, 30).map((policy) => {
            const active = selected.some((selectedPolicy) => selectedPolicy.slug === policy.slug);

            return (
              <button
                key={policy.slug}
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
                  active ? 'bg-primary-subtle' : 'hover:bg-bg-elevated'
                }`}
                onClick={() => {
                  if (active) {
                    setSelected(selected.filter((selectedPolicy) => selectedPolicy.slug !== policy.slug));
                  } else {
                    setSelected([...selected, policy]);
                  }
                }}
              >
                <span className="text-text-primary">{policy.title}</span>
                <span className="font-mono text-[12px] text-text-muted">{policy.slug}</span>
              </button>
            );
          })}
        </div>

        {selected.length ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((policy) => (
              <PolicyCitationChip
                key={policy.slug}
                slug={policy.slug}
                title={policy.title}
                removable
                onRemove={() =>
                  setSelected(selected.filter((selectedPolicy) => selectedPolicy.slug !== policy.slug))
                }
              />
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="danger"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                reason: reason.trim(),
                policyRefs: selected.map((policy) => policy.slug),
              })
            }
          >
            Confirm rejection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
