'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';

type ReturnItem = { item_id: string; item_name: string; quantity: number };

export function CreateReturnModal({
  open,
  onClose,
  caseId,
  orderId,
  items,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  orderId: string;
  items: ReturnItem[];
  onSuccess: () => Promise<void> | void;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [returnReason, setReturnReason] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected([]);
    setReturnReason('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const onSubmit = async () => {
    setError(null);

    if (!selected.length) {
      setError('Please select at least one item to return.');
      return;
    }
    if (returnReason.trim().length < 1) {
      setError('Return reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post<unknown>('/return_requests', {
        case_id: caseId,
        order_id: orderId,
        item_ids: selected,
        return_reason: returnReason.trim(),
      });
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create return request.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Create Return Request" wide>
      <div className="flex flex-col gap-4">
        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        {items.length ? (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <label key={item.item_id} className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-border-default bg-bg-surface px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-text-primary">{item.item_name}</div>
                  <div className="text-[12px] text-text-secondary">Qty: {item.quantity}</div>
                </div>
                <input
                  type="checkbox"
                  checked={selected.includes(item.item_id)}
                  onChange={() => toggleItem(item.item_id)}
                  disabled={submitting}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-text-muted">No order items available for this case.</div>
        )}

        <Textarea
          label="Return Reason"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          disabled={submitting}
          rows={4}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose()} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={() => void onSubmit()} disabled={submitting}>
            Create return
          </Button>
        </div>
      </div>
    </Modal>
  );
}

