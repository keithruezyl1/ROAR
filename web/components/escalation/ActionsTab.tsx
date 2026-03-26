'use client';

import * as React from 'react';
import clsx from 'clsx';

import { api } from '@/lib/api';
import { ConversationClosePanel } from '@/components/chat/ConversationClosePanel';
import { Button } from '@/components/shared/Button';

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

function parseTxnAmount(bundle: EscalationCaseData['information_bundle']): number | null {
  const txn = bundle?.transaction;
  if (!txn) return null;
  const amount = Number(txn.amount);
  if (!Number.isFinite(amount)) return null;
  return amount;
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

  const hasNonFailedRefund = React.useMemo(() => refundRequests.some((r) => r.status !== 'failed'), [refundRequests]);
  const hasPendingReturn = React.useMemo(() => returnRequests.some((r) => r.status === 'pending'), [returnRequests]);
  const pendingReturn = React.useMemo(() => returnRequests.find((r) => r.status === 'pending') ?? null, [returnRequests]);
  const hasAnyReturn = returnRequests.length > 0;

  const dismissFeedbackSoon = React.useCallback(() => {
    window.setTimeout(() => setFeedback(null), 3000);
  }, []);

  const refetchRecords = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [refundRes, returnRes] = await Promise.all([
        api.get<{ refund_requests: RefundRequestRecord[] }>(`/cases/${caseId}/refund_requests`),
        api.get<{ return_requests: ReturnRequestRecord[] }>(`/cases/${caseId}/return_requests`),
      ]);
      setRefundRequests(refundRes.refund_requests ?? []);
      setReturnRequests(returnRes.return_requests ?? []);
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

      // For escalation dispositions, immediately end the live conversation and return the agent
      // to the dashboard (do not wait on return logistics).
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

  return (
    <div className="flex h-full flex-col gap-4">
      {feedback ? (
        <div className={clsx('text-[13px]', feedback.type === 'success' ? 'text-success' : 'text-danger')}>{feedback.message}</div>
      ) : null}

      {caseData.dispute_type === 'refund' ? (
        <div className="flex flex-col gap-4">
          <div className="text-[13px] font-medium text-text-secondary">Refund actions</div>

          {!hasNonFailedRefund ? (
            <div className="grid grid-cols-1 gap-2">
              <Button variant="secondary" onClick={() => openRefund('full')}>
                Create Full Refund
              </Button>
              <Button variant="secondary" onClick={() => openRefund('partial')}>
                Create Partial Refund
              </Button>
            </div>
          ) : (
            <div className="text-[13px] text-text-muted">A refund request already exists for this case.</div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="danger"
              onClick={() => setDenyRefundOpen(true)}
              disabled={loading}
            >
              Deny Refund
            </Button>
            <Button variant="secondary" onClick={() => setDuplicateOpen(true)} disabled={loading}>
              Mark Duplicate / Already Refunded
            </Button>
          </div>

          <div className="mt-2 text-[13px] font-medium text-text-secondary">Return actions</div>

          {hasPendingReturn ? (
            <div className="rounded-card border border-border-default bg-bg-surface p-3 text-[13px] text-text-muted">
              A return request is already pending for this case.
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setCreateReturnOpen(true)} disabled={loading}>
              Create Return Request
            </Button>
          )}

          {pendingReturn ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setReturnStatusMode('approved');
                  setTargetReturnId(pendingReturn.id);
                  setReturnStatusOpen(true);
                }}
                disabled={loading}
              >
                Approve Return
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setReturnStatusMode('rejected');
                  setTargetReturnId(pendingReturn.id);
                  setReturnStatusOpen(true);
                }}
                disabled={loading}
              >
                Reject Return
              </Button>
            </div>
          ) : null}

          {hasAnyReturn && !hasNonFailedRefund ? (
            <Button variant="secondary" onClick={() => openRefund('partial')} disabled={loading}>
              Issue Refund Instead
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="text-[13px] text-text-muted">Delivery escalation: use the conversation close controls below.</div>
      )}

      <div className="mt-auto">
        <ConversationClosePanel onConfirm={onClose} />
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
        items={(caseData.information_bundle?.order_items ?? []) as Array<{ item_id: string; item_name: string; quantity: number }>}
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


