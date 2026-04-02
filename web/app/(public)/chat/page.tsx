'use client';

import * as React from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { IntakeForm } from '@/components/chat/IntakeForm';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { decodeToken, logout } from '@/lib/auth';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { api } from '@/lib/api';
import { deriveCaseContextFromCase, getCaseContext, saveCaseContext } from '@/lib/intakeContext';
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
      const context = storedContext ?? deriveCaseContextFromCase(data);
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

  React.useEffect(() => {
    setActiveCaseId(resumeCaseId);
  }, [resumeCaseId]);

  const handleCreated = React.useCallback((created: { caseId: string; intakeReason: IntakeReason; disputeType: DisputeType }) => {
    setActiveCaseId(created.caseId);
    setIntakeReason(created.intakeReason);
    setActiveDisputeType(created.disputeType);
    router.replace(`/chat?caseId=${created.caseId}`);
  }, [router]);

  const handleStartNewDispute = React.useCallback(() => {
    setActiveCaseId(null);
    setCaseDetail(null);
    setCaseError(null);
    setIntakeReason(null);
    setActiveDisputeType(null);
    router.replace('/chat');
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
      <div className="border-b border-border-default bg-bg-surface/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between">
          <Link href="/cases" className="flex items-center gap-3 rounded-btn transition-colors hover:text-text-primary">
            <Image src="/roar-logo.png" alt="ROAR logo" width={36} height={36} className="h-9 w-9 rounded-btn object-cover" />
            <div>
              <div className="text-[16px] font-semibold">ROAR Engine</div>
              <div className="text-[13px] text-text-muted">Customer Chat</div>
            </div>
          </Link>

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
      </div>

      <div className="mx-auto flex h-[calc(100vh-94px)] max-w-[1080px] flex-col px-4 pb-6 pt-5 sm:px-6">
        {!activeCaseId ? (
          <div className="mx-auto flex h-full w-full max-w-[760px] items-start pt-8">
            <div className="w-full transition duration-normal">
              <button
                type="button"
                onClick={() => router.push('/cases')}
                className="mb-3 inline-flex items-center text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Go back to cases
              </button>
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
          <div className="mx-auto flex h-full w-full max-w-[760px] items-center">
            <div className="h-full w-full overflow-hidden">
              <ChatWindow
                caseId={caseDetail.id}
                mode="customer"
                caseStatus={caseDetail.status}
                disputeType={activeDisputeType ?? caseDetail.dispute_type}
                intakeReason={intakeReason}
                intakeMessage={caseDetail.intake_message}
                resolutionPreference={caseDetail.resolution_preference}
                onGoToCases={() => router.push('/cases')}
                onStartNewDispute={handleStartNewDispute}
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
