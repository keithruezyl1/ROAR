'use client';

import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ConversationClosePanel } from '@/components/chat/ConversationClosePanel';
import { api } from '@/lib/api';

export default function EscalationChatPage({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const caseId = params.caseId;

  const close = async (reason: 'resolved' | 'unresponsive' | 'duplicate') => {
    await api.post<unknown>(`/cases/${caseId}/close`, {
      closed_by: 'agent',
      close_reason: reason,
    });
    router.push('/escalation');
  };

  return (
    <AppShell role="escalation" title="Live chat">
      <div className="flex h-[calc(100vh-140px)] gap-6">
        <div className="flex-1 overflow-hidden">
          <ChatWindow caseId={caseId} mode="agent" />
        </div>
        <div className="w-[360px] max-xl:hidden">
          <ConversationClosePanel onConfirm={close} />
        </div>
      </div>
    </AppShell>
  );
}
