'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EscalationWorkPanel, type EscalationCaseData } from '@/components/escalation/EscalationWorkPanel';
import { api } from '@/lib/api';
import { decodeToken } from '@/lib/auth';
import type { Case, CloseReason } from '@/types';

export default function EscalationCasePage({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const caseId = params.caseId;
  const [caseData, setCaseData] = React.useState<Case | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState(false);

  const loadCase = React.useCallback(async () => {
    const data = await api.get<Case>(`/cases/${caseId}`);
    setCaseData(data);
    return data;
  }, [caseId]);

  React.useEffect(() => {
    let cancelled = false;

    const claimAndLoad = async () => {
      try {
        setLoading(true);
        setError(null);
        setBlocked(false);

        const payload = decodeToken();
        if (!payload?.sub) {
          router.replace('/login');
          return;
        }

        const current = await api.get<Case>(`/cases/${caseId}`);
        if (cancelled) return;

        if (current.assigned_to && current.assigned_to !== payload.sub) {
          setCaseData(current);
          setBlocked(true);
          return;
        }

        if (current.status === 'escalated_human_required') {
          const claimed = await api.post<Case>(`/cases/${caseId}/claim`);
          if (cancelled) return;
          setCaseData(claimed);
        } else {
          setCaseData(current);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load escalation case.';
        if (!cancelled) {
          setError(message);
          setBlocked(message.includes('already claimed') || message.includes('handled by another agent'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void claimAndLoad();
    return () => {
      cancelled = true;
    };
  }, [caseId, router]);

  const handleClose = React.useCallback(async (reason: CloseReason) => {
    await api.post<unknown>(`/cases/${caseId}/close`, {
      closed_by: 'agent',
      close_reason: reason,
    });
    router.push('/escalation');
  }, [caseId, router]);

  const refreshCase = React.useCallback(async () => {
    await loadCase();
  }, [loadCase]);

  const referenceNumber = caseData?.reference_number ?? 'Case';
  const workPanelData: EscalationCaseData | null = caseData ? {
    reference_number: caseData.reference_number,
    dispute_type: caseData.dispute_type,
    status: caseData.status,
    order_id: caseData.order_id,
    customer_name: caseData.customer_name,
    customer_email: caseData.customer_email,
    information_bundle: caseData.information_bundle,
    triage_decision: caseData.triage_decision,
    escalation_summary: caseData.escalation_summary,
  } : null;

  return (
    <AppShell role="escalation" title={referenceNumber}>
      <div className="mb-4 text-[13px] text-text-secondary">
        <Link href="/escalation" className="hover:underline">
          Dashboard
        </Link>{' '}
        <span className="text-text-muted">&gt;</span> {referenceNumber}
      </div>

      {loading ? (
        <div className="text-[13px] text-text-muted">Loading case...</div>
      ) : error && !caseData ? (
        <div className="rounded-card border border-danger bg-danger-bg px-5 py-4 text-[13px] text-danger">{error}</div>
      ) : blocked ? (
        <div className="rounded-card border border-border-default bg-bg-surface p-6">
          <div className="text-[18px] font-semibold text-text-primary">Case unavailable</div>
          <div className="mt-2 text-[14px] text-text-secondary">
            This escalation case is already being handled by another agent.
          </div>
          <div className="mt-4">
            <Link href="/escalation">
              <span className="text-[14px] font-medium text-primary hover:underline">Return to dashboard</span>
            </Link>
          </div>
        </div>
      ) : caseData && workPanelData ? (
        <div className="flex h-[calc(100vh-180px)] min-h-[620px] gap-6">
          <div className="w-3/5 overflow-hidden">
            <ChatWindow
              caseId={caseId}
              mode="agent"
              caseStatus={caseData.status}
              disputeType={caseData.dispute_type}
            />
          </div>
          <div className="w-2/5 min-w-[360px] overflow-hidden max-xl:w-[400px]">
            <EscalationWorkPanel
              caseId={caseId}
              caseData={workPanelData}
              onClose={handleClose}
              onActionSuccess={refreshCase}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

