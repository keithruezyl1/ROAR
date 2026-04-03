'use client';

import * as React from 'react';
import clsx from 'clsx';
import {
  Ban,
  Check,
  CircleSlash,
  CreditCard,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  ShieldAlert,
  Truck,
} from 'lucide-react';

import { api } from '@/lib/api';
import { ConversationClosePanel } from '@/components/chat/ConversationClosePanel';
import { Button } from '@/components/shared/Button';
import type { ReplacementRequest, ReplacementRequestStatus } from '@/types';

import type { EscalationCaseData } from '@/components/escalation/EscalationWorkPanel';
import { RefundModal } from '@/components/escalation/actions/RefundModal';
import { DenyRefundModal } from '@/components/escalation/actions/DenyRefundModal';
import { DuplicateRefundModal } from '@/components/escalation/actions/DuplicateRefundModal';
import { CreateReturnModal } from '@/components/escalation/actions/CreateReturnModal';
import { ReturnStatusModal } from '@/components/escalation/actions/ReturnStatusModal';

type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';

type RefundRequestRecord = {
  id: string;
  status: string;
  amount: number;
  reason: string;
};

type ReturnRequestRecord = {
  id: string;
  status: string;
  item_ids: string[];
  return_reason: string;
};

type Feedback = { type: 'success' | 'error'; message: string };
type RecordLike = Record<string, unknown>;
type ReturnModalItem = { item_id: string; item_name: string; quantity: number };
type ActionItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
};

function parseTxnAmount(bundle: EscalationCaseData['information_bundle']): number | null {
  const txn = bundle?.transaction;
  if (!txn) return null;
  const amount = Number(txn.amount);
  if (!Number.isFinite(amount)) return null;
  return amount;
}

function readRecord(value: unknown): RecordLike | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordLike) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function requestTone(status: string) {
  if (status === 'pending') return 'border border-warning bg-warning-bg text-warning';
  if (status === 'approved' || status === 'executing') return 'border border-info bg-info-bg text-info';
  if (status === 'completed' || status === 'processed') return 'border border-success bg-success-bg text-success';
  return 'border border-danger bg-danger-bg text-danger';
}

function canTransitionReplacement(current: ReplacementRequestStatus, next: ReplacementRequestStatus) {
  if (current === 'pending') return next === 'approved' || next === 'rejected' || next === 'cancelled';
  if (current === 'approved') return next === 'executing' || next === 'cancelled';
  if (current === 'executing') return next === 'completed' || next === 'cancelled';
  return false;
}

function ActionSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-1 py-1">
      <div className="flex flex-col gap-1">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary">{title}</div>
        <div className="text-[12px] text-text-muted">{description}</div>
      </div>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function ActionGrid({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) return null;

  const singleAction = actions.length === 1;

  return (
    <div className={clsx('grid gap-2', singleAction ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant={action.variant ?? 'secondary'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className={clsx(
              'justify-start text-[13px]',
              singleAction ? 'w-full' : 'w-full sm:min-w-0'
            )}
          >
            <Icon data-icon="inline-start" className="h-4 w-4 shrink-0" />
            <span className="truncate">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function buildReturnItems(caseData: EscalationCaseData): ReturnModalItem[] {
  const bundle = readRecord(caseData.information_bundle);
  const rawItems =
    Array.isArray(bundle?.order_items_detail)
      ? bundle.order_items_detail
      : Array.isArray(bundle?.order_items)
        ? bundle.order_items
        : [];

  return rawItems
    .map((raw) => {
      const item = readRecord(raw);
      const itemId = readString(item?.item_id);
      const itemName = readString(item?.item_name) ?? readString(item?.product_name);
      const quantity = readNumber(item?.quantity) ?? readNumber(item?.quantity_ordered) ?? 1;
      if (!itemId || !itemName) return null;
      return { item_id: itemId, item_name: itemName, quantity };
    })
    .filter((item): item is ReturnModalItem => item !== null);
}

function buildReplacementItems(caseData: EscalationCaseData): ReplacementRequest['replacement_items'] {
  const triage = readRecord(caseData.triage_decision);
  const bundle = readRecord(caseData.information_bundle);
  const rawItems =
    Array.isArray(triage?.replacement_items) && triage.replacement_items.length > 0
      ? triage.replacement_items
      : Array.isArray(bundle?.affected_items_detail) && bundle.affected_items_detail.length > 0
        ? bundle.affected_items_detail
        : Array.isArray(bundle?.order_items_detail) && bundle.order_items_detail.length > 0
          ? bundle.order_items_detail
          : Array.isArray(bundle?.order_items)
            ? bundle.order_items
            : [];

  return rawItems
    .map((raw) => {
      const item = readRecord(raw);
      if (!item) return null;

      const itemId = readString(item.item_id) ?? readString(item.sku);
      const sku = readString(item.sku) ?? readString(item.item_id);
      const quantity = readNumber(item.quantity) ?? readNumber(item.quantity_ordered) ?? 1;
      const productName = readString(item.product_name) ?? readString(item.item_name);

      if (!itemId && !sku) return null;

      return {
        item_id: itemId ?? undefined,
        sku: sku ?? undefined,
        quantity,
        product_name: productName ?? undefined,
        warehouse_location: readString(item.warehouse_location) ?? undefined,
        quantity_available_now: readNumber(item.quantity_available_now),
        unit_price: readNumber(item.unit_price),
        order_id: readString(item.order_id) ?? caseData.order_id,
      };
    })
    .filter((item): item is ReplacementRequest['replacement_items'][number] => item !== null);
}

export function ActionsTab({
  caseId,
  caseData,
  onClose,
  onActionSuccess,
}: {
  caseId: string;
  caseData: EscalationCaseData;
  onClose: (reason: CloseReason) => Promise<void> | void;
  onActionSuccess: () => Promise<void> | void;
}) {
  const [refundRequests, setRefundRequests] = React.useState<RefundRequestRecord[]>([]);
  const [returnRequests, setReturnRequests] = React.useState<ReturnRequestRecord[]>([]);
  const [replacementRequests, setReplacementRequests] = React.useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);

  const [refundModalOpen, setRefundModalOpen] = React.useState(false);
  const [refundMode, setRefundMode] = React.useState<'full' | 'partial'>('partial');

  const [denyRefundOpen, setDenyRefundOpen] = React.useState(false);
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);

  const [createReturnOpen, setCreateReturnOpen] = React.useState(false);
  const [returnStatusOpen, setReturnStatusOpen] = React.useState(false);
  const [returnStatusMode, setReturnStatusMode] = React.useState<'approved' | 'rejected'>('approved');
  const [targetReturnId, setTargetReturnId] = React.useState<string | null>(null);

  const txnAmount = React.useMemo(() => parseTxnAmount(caseData.information_bundle), [caseData.information_bundle]);
  const triage = React.useMemo(() => readRecord(caseData.triage_decision), [caseData]);
  const returnItems = React.useMemo(() => buildReturnItems(caseData), [caseData]);
  const replacementItems = React.useMemo(() => buildReplacementItems(caseData), [caseData]);

  const hasNonFailedRefund = React.useMemo(() => refundRequests.some((r) => r.status !== 'failed'), [refundRequests]);
  const hasPendingReturn = React.useMemo(() => returnRequests.some((r) => r.status === 'pending'), [returnRequests]);
  const pendingReturn = React.useMemo(() => returnRequests.find((r) => r.status === 'pending') ?? null, [returnRequests]);
  const hasAnyReturn = returnRequests.length > 0;
  const activeReplacement = React.useMemo(
    () => replacementRequests.find((r) => r.status === 'pending' || r.status === 'approved' || r.status === 'executing') ?? null,
    [replacementRequests]
  );

  const dismissFeedbackSoon = React.useCallback(() => {
    window.setTimeout(() => setFeedback(null), 3000);
  }, []);

  const refetchRecords = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [refundRes, returnRes, replacementRes] = await Promise.all([
        api.get<{ refund_requests: RefundRequestRecord[] }>(`/cases/${caseId}/refund_requests`),
        api.get<{ return_requests: ReturnRequestRecord[] }>(`/cases/${caseId}/return_requests`),
        api.get<{ replacement_requests: ReplacementRequest[] }>(`/cases/${caseId}/replacement_requests`),
      ]);
      setRefundRequests(refundRes.refund_requests ?? []);
      setReturnRequests(returnRes.return_requests ?? []);
      setReplacementRequests(replacementRes.replacement_requests ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load resolution records.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void refetchRecords();
  }, [refetchRecords]);

  const onActionSuccessInternal = React.useCallback(
    async (successMessage: string, closeReason?: CloseReason) => {
      setFeedback({ type: 'success', message: successMessage });
      dismissFeedbackSoon();
      await refetchRecords();
      await onActionSuccess();

      if (closeReason) {
        await onClose(closeReason);
      }
    },
    [dismissFeedbackSoon, onActionSuccess, onClose, refetchRecords]
  );

  const openRefund = (mode: 'full' | 'partial') => {
    setRefundMode(mode);
    setRefundModalOpen(true);
  };

  const createReplacementRequest = async () => {
    if (!replacementItems.length) {
      setFeedback({ type: 'error', message: 'No replacement items are available to create a replacement request.' });
      dismissFeedbackSoon();
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await api.post('/replacement-requests', {
        case_id: caseId,
        order_id: caseData.order_id,
        status: 'pending',
        reason: readString(triage?.reason) || 'Replacement created by escalation agent.',
        eligible_amount: readNumber(triage?.eligible_amount),
        replacement_items: replacementItems,
      });
      await onActionSuccessInternal('Replacement request created.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create replacement request.';
      setFeedback({ type: 'error', message: msg });
      dismissFeedbackSoon();
    } finally {
      setLoading(false);
    }
  };

  const updateReplacement = async (requestId: string, status: ReplacementRequestStatus) => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Enter an optional rejection reason for this replacement request.');
      if (input == null) return;
      reason = input.trim() || undefined;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await api.patch(`/replacement-requests/${requestId}`, { status, reason });
      await onActionSuccessInternal('Replacement request updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update replacement request.';
      setFeedback({ type: 'error', message: msg });
      dismissFeedbackSoon();
    } finally {
      setLoading(false);
    }
  };

  const refundCreateActions: ActionItem[] = !hasNonFailedRefund
    ? [
        {
          label: 'Full refund',
          icon: CreditCard,
          onClick: () => openRefund('full'),
          disabled: loading,
        },
        {
          label: 'Partial refund',
          icon: ShieldAlert,
          onClick: () => openRefund('partial'),
          disabled: loading,
        },
      ]
    : [];

  const refundReviewActions: ActionItem[] = [
    {
      label: 'Deny refund',
      icon: Ban,
      variant: 'danger',
      onClick: () => setDenyRefundOpen(true),
      disabled: loading,
    },
    {
      label: 'Mark duplicate',
      icon: CircleSlash,
      onClick: () => setDuplicateOpen(true),
      disabled: loading,
    },
  ];

  const returnActions: ActionItem[] = [];
  if (!hasPendingReturn) {
    returnActions.push({
      label: 'Create return',
      icon: RotateCcw,
      onClick: () => setCreateReturnOpen(true),
      disabled: loading || returnItems.length === 0,
    });
  }
  if (pendingReturn) {
    returnActions.push(
      {
        label: 'Approve return',
        icon: Check,
        onClick: () => {
          setReturnStatusMode('approved');
          setTargetReturnId(pendingReturn.id);
          setReturnStatusOpen(true);
        },
        disabled: loading,
      },
      {
        label: 'Reject return',
        icon: Ban,
        variant: 'danger',
        onClick: () => {
          setReturnStatusMode('rejected');
          setTargetReturnId(pendingReturn.id);
          setReturnStatusOpen(true);
        },
        disabled: loading,
      }
    );
  }
  if (hasAnyReturn && !hasNonFailedRefund) {
    returnActions.push({
      label: 'Refund instead',
      icon: CreditCard,
      onClick: () => openRefund('partial'),
      disabled: loading,
    });
  }

  const replacementActions: ActionItem[] = [];
  if (activeReplacement) {
    if (canTransitionReplacement(activeReplacement.status, 'approved')) {
      replacementActions.push({
        label: 'Approve replacement',
        icon: Check,
        variant: 'primary',
        onClick: () => void updateReplacement(activeReplacement.id, 'approved'),
        disabled: loading,
      });
    }
    if (canTransitionReplacement(activeReplacement.status, 'executing')) {
      replacementActions.push({
        label: 'Start execution',
        icon: Truck,
        onClick: () => void updateReplacement(activeReplacement.id, 'executing'),
        disabled: loading,
      });
    }
    if (canTransitionReplacement(activeReplacement.status, 'completed')) {
      replacementActions.push({
        label: 'Complete replacement',
        icon: PackageCheck,
        variant: 'primary',
        onClick: () => void updateReplacement(activeReplacement.id, 'completed'),
        disabled: loading,
      });
    }
    if (canTransitionReplacement(activeReplacement.status, 'rejected')) {
      replacementActions.push({
        label: 'Reject replacement',
        icon: Ban,
        variant: 'danger',
        onClick: () => void updateReplacement(activeReplacement.id, 'rejected'),
        disabled: loading,
      });
    }
    if (canTransitionReplacement(activeReplacement.status, 'cancelled')) {
      replacementActions.push({
        label: 'Cancel replacement',
        icon: CircleSlash,
        variant: 'ghost',
        onClick: () => void updateReplacement(activeReplacement.id, 'cancelled'),
        disabled: loading,
      });
    }
  } else {
    replacementActions.push({
      label: 'Create replacement',
      icon: PackageOpen,
      onClick: () => void createReplacementRequest(),
      disabled: loading || replacementItems.length === 0,
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {feedback ? (
        <div className={clsx('text-[13px]', feedback.type === 'success' ? 'text-success' : 'text-danger')}>
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <ActionSection
          title="Refund actions"
          description={hasNonFailedRefund ? 'A refund record already exists. You can still deny or mark this case as duplicate.' : 'Create or review a refund outcome for this case.'}
        >
          {!hasNonFailedRefund ? (
            <ActionGrid actions={refundCreateActions} />
          ) : (
            <div className="rounded-card border border-border-default bg-bg-base px-3 py-2 text-[12px] text-text-muted">
              A refund request already exists for this case.
            </div>
          )}
          <ActionGrid actions={refundReviewActions} />
        </ActionSection>

        <ActionSection
          title="Return actions"
          description={pendingReturn ? 'A return request is already pending and ready for review.' : 'Create or resolve a return request when that is the best path.'}
        >
          {hasPendingReturn ? (
            <div className="rounded-card border border-border-default bg-bg-base px-3 py-2 text-[12px] text-text-muted">
              A return request is already pending for this case.
            </div>
          ) : null}
          <ActionGrid actions={returnActions} />
        </ActionSection>

        <ActionSection
          title="Replacement actions"
          description={activeReplacement ? 'The replacement request is active. Progress it through the next operational step.' : 'Create a replacement request if stock and case context support it.'}
        >
          {activeReplacement ? (
            <div className="rounded-card border border-border-default bg-bg-base p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">Replacement request</div>
                  <div className="mt-1 text-[12px] text-text-muted">Order {activeReplacement.order_id}</div>
                </div>
                <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${requestTone(activeReplacement.status)}`}>
                  {activeReplacement.status}
                </span>
              </div>
              <div className="mt-2 text-[13px] text-text-secondary">{activeReplacement.reason}</div>
              <div className="mt-2 flex flex-col gap-1 text-[12px] text-text-muted">
                <div>
                  {activeReplacement.replacement_items.length > 0
                    ? `${activeReplacement.replacement_items.length} replacement item(s)`
                    : 'No replacement items attached'}
                </div>
                <div>
                  {activeReplacement.eligible_amount != null
                    ? `THB ${activeReplacement.eligible_amount.toFixed(2)}`
                    : 'Eligible amount not set'}
                </div>
              </div>
              <div className="mt-3">
                <ActionGrid actions={replacementActions} />
              </div>
            </div>
          ) : (
            <ActionGrid actions={replacementActions} />
          )}
        </ActionSection>
      </div>

      <div className="mt-auto">
        <ConversationClosePanel onConfirm={onClose} requireFinalConfirmation />
      </div>

      <RefundModal
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        mode={refundMode}
        caseId={caseId}
        orderId={caseData.order_id}
        transactionAmount={txnAmount}
        onSuccess={async () => onActionSuccessInternal('Refund request created.')}
      />

      <DenyRefundModal
        open={denyRefundOpen}
        onClose={() => setDenyRefundOpen(false)}
        caseId={caseId}
        onSuccess={async () => onActionSuccessInternal('Refund denied.')}
      />

      <DuplicateRefundModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        caseId={caseId}
        onSuccess={async () => onActionSuccessInternal('Duplicate marked.')}
      />

      <CreateReturnModal
        open={createReturnOpen}
        onClose={() => setCreateReturnOpen(false)}
        caseId={caseId}
        orderId={caseData.order_id}
        items={returnItems}
        onSuccess={async () => onActionSuccessInternal('Return request created.')}
      />

      <ReturnStatusModal
        open={returnStatusOpen}
        onClose={() => {
          setReturnStatusOpen(false);
          setTargetReturnId(null);
        }}
        mode={returnStatusMode}
        returnRequestId={targetReturnId}
        onSuccess={async () => onActionSuccessInternal('Return request updated.')}
      />
    </div>
  );
}
