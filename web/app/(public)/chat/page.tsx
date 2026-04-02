'use client';

import * as React from 'react';

import { useSearchParams } from 'next/navigation';
import { IntakeForm } from '@/components/chat/IntakeForm';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CaseStatusTracker } from '@/components/chat/CaseStatusTracker';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { logout } from '@/lib/auth';
import { Button } from '@/components/shared/Button';

function ChatContent() {
  const searchParams = useSearchParams();
  const resumeCaseId = searchParams.get('caseId');

  const [created, setCreated] = React.useState<{
    caseId: string;
    referenceNumber: string;
    disputeType: 'refund' | 'delivery';
  } | null>(resumeCaseId ? { caseId: resumeCaseId, referenceNumber: '', disputeType: 'refund' } : null);

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
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="mx-auto flex h-[calc(100vh-88px)] max-w-[560px] flex-col px-4 pb-6">
        {!created ? (
          <div className="flex flex-1 items-center">
            <div className="w-full transition duration-normal">
              <IntakeForm onCreated={(v) => setCreated(v)} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden transition duration-normal">
            <div className="overflow-hidden rounded-card border border-border-default">
              <CaseStatusTracker status="pending_triage" defaultExpanded={false} />
            </div>
            <div className="mt-4 flex-1 overflow-hidden">
              <ChatWindow caseId={created.caseId} mode="customer" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-bg-base p-8 text-text-primary">Loading chat...</div>}>
      <ChatContent />
    </React.Suspense>
  );
}
