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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} aria-hidden>
      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? 'h-4 w-4'} aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const fullName = React.useMemo(() => {
    const payload = decodeToken();
    return payload?.full_name ?? 'Customer';
  }, []);

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

      <div className="mx-auto flex h-[calc(100vh-94px)] max-w-[1080px] flex-col px-4 pb-6 pt-5 sm:px-6">
        {!activeCaseId ? (
          <div className="mx-auto flex h-full w-full max-w-[760px] items-start pt-8">
            <div className="w-full transition duration-normal">
              <button
                type="button"
                onClick={() => router.push('/cases')}
                className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <ChevronLeftIcon /> Go back to cases
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
                invalidReasonCode={caseDetail.invalid_reason_code}
                invalidReasonDetail={caseDetail.invalid_reason_detail}
                proofUploads={caseDetail.proof_uploads}
                proofAnalysisStatus={caseDetail.proof_analysis_status}
                onGoToCases={() => router.push('/cases')}
                onStartNewDispute={handleStartNewDispute}
                onCloseCase={() => {
                  setEndError(null);
                  setEndOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}

        {caseDetail && caseDetail.status !== 'closed' ? (
          <div className="pointer-events-none fixed bottom-6 right-6 z-[70]">
            <Button
              variant="danger"
              size="sm"
              className="pointer-events-auto shadow-[0_12px_28px_rgba(0,0,0,0.22)] hover:bg-danger hover:text-text-inverse active:bg-danger"
              onClick={() => {
                setEndError(null);
                setEndOpen(true);
              }}
              disabled={ending}
            >
              End conversation
            </Button>
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
