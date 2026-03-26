'use client';

import * as React from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { IntakeForm } from '@/components/chat/IntakeForm';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { decodeToken, logout } from '@/lib/auth';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { api } from '@/lib/api';
import { deriveCaseContextFromIntakeMessage, getCaseContext, saveCaseContext } from '@/lib/intakeContext';
import type { Case, DisputeType, IntakeReason } from '@/types';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeCaseId = searchParams.get('caseId');

  const [mounted, setMounted] = React.useState(false);
  const [activeCaseId, setActiveCaseId] = React.useState<string | null>(resumeCaseId);
  const [caseDetail, setCaseDetail] = React.useState<Case | null>(null);
  const [loadingCase, setLoadingCase] = React.useState(false);
  const [caseError, setCaseError] = React.useState<string | null>(null);
  const [intakeReason, setIntakeReason] = React.useState<IntakeReason | null>(null);
  const [activeDisputeType, setActiveDisputeType] = React.useState<DisputeType | null>(null);

  const [endOpen, setEndOpen] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const [endError, setEndError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const payload = decodeToken();
    if (!payload) {
      router.replace('/login?next=/chat');
      return;
    }
    if (payload.role === 'approver') {
      router.replace('/approver');
      return;
    }
    if (payload.role === 'escalation') {
      router.replace('/escalation');
      return;
    }
  }, [router]);

  const loadCase = React.useCallback(async (caseId: string) => {
    setLoadingCase(true);
    setCaseError(null);
    try {
      const data = await api.get<Case>(`/cases/${caseId}`);
      setCaseDetail(data);
      const storedContext = getCaseContext(caseId);
      const context = storedContext ?? deriveCaseContextFromIntakeMessage(data.intake_message, data.dispute_type);
      saveCaseContext(caseId, context);
      setIntakeReason(context.intakeReason);
      setActiveDisputeType(context.disputeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load case.';
      setCaseError(message);
      setCaseDetail(null);
      setIntakeReason(null);
      setActiveDisputeType(null);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  React.useEffect(() => {
    if (!activeCaseId) {
      setCaseDetail(null);
      setIntakeReason(null);
      setActiveDisputeType(null);
      return;
    }

    void loadCase(activeCaseId);
    const intervalId = window.setInterval(() => void loadCase(activeCaseId), 4000);
    return () => window.clearInterval(intervalId);
  }, [activeCaseId, loadCase]);

  const handleCreated = React.useCallback((created: { caseId: string; intakeReason: IntakeReason; disputeType: DisputeType }) => {
    setActiveCaseId(created.caseId);
    setIntakeReason(created.intakeReason);
    setActiveDisputeType(created.disputeType);
    router.replace(`/chat?caseId=${created.caseId}`);
  }, [router]);

  const endConversation = React.useCallback(async () => {
    if (!caseDetail) return;
    setEndError(null);
    setEnding(true);
    try {
      await api.post<unknown>(`/cases/${caseDetail.id}/close`, {
        closed_by: 'customer',
        close_reason: null,
      });
      // Immediately reflect closed in UI; polling will also pick it up.
      setCaseDetail({ ...caseDetail, status: 'closed' });
      setEndOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to close conversation.';
      setEndError(message);
    } finally {
      setEnding(false);
    }
  }, [caseDetail]);


  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary text-text-inverse font-bold">
            R
          </div>
          <div>
            <div className="text-[15px] font-semibold">ROAR Engine</div>
            <div className="text-[13px] text-text-muted">Customer Chat</div>
            <button
              type="button"
              onClick={() => router.push('/cases')}
              className="mt-1 text-left text-[13px] font-medium text-text-secondary hover:text-text-primary"
            >
              &lt;- go to cases
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          {caseDetail && caseDetail.status !== 'closed' ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setEndError(null);
                setEndOpen(true);
              }}
              disabled={ending}
            >
              End conversation
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="mx-auto flex h-[calc(100vh-88px)] max-w-[560px] flex-col px-4 pb-6">
        {!activeCaseId ? (
          <div className="flex flex-1 items-center">
            <div className="w-full transition duration-normal">
              <IntakeForm onCreated={handleCreated} />
            </div>
          </div>
        ) : loadingCase && !caseDetail ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-text-muted">Loading case...</div>
        ) : caseError && !caseDetail ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-card border border-danger bg-danger-bg px-5 py-4 text-[13px] text-danger">{caseError}</div>
          </div>
        ) : caseDetail ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full h-[calc(100vh-220px)] max-h-[760px] -mt-6 overflow-hidden">
              <ChatWindow
                caseId={caseDetail.id}
                mode="customer"
                caseStatus={caseDetail.status}
                disputeType={activeDisputeType ?? caseDetail.dispute_type}
                intakeReason={intakeReason}
              />
            </div>
          </div>
        ) : null}


      <Modal
        open={endOpen}
        onClose={() => {
          if (!ending) setEndOpen(false);
        }}
        title="End conversation?"
      >
        <div className="flex flex-col gap-4">
          <div className="text-[14px] text-text-secondary">
            This will close this case. You can still view it later in My Cases, but you will not be able to send new messages.
          </div>
          {endError ? <div className="text-[13px] text-danger">{endError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEndOpen(false)} disabled={ending}>
              Cancel
            </Button>
            <Button variant="danger" loading={ending} onClick={() => void endConversation()} disabled={ending}>
              End conversation
            </Button>
          </div>
        </div>
      </Modal>

      </div>
    </div>
  );
}


export default function ChatPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <ChatPageContent />
    </React.Suspense>
  );
}

