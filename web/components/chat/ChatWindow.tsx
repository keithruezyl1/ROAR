'use client';

import * as React from 'react';

import { api, customerApi } from '@/lib/api';
import { BUSINESS_RULES } from '@/lib/constants';
import { INTAKE_ISSUE_OPTIONS } from '@/lib/intakeContext';
import { ChatBubble, type SenderType } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ParticipantBanner } from './ParticipantBanner';
import { TypingIndicator } from './TypingIndicator';
import { StructuredResponse, getStructuredConfig } from './StructuredResponse';
import type { CaseStatus, DisputeType, IntakeReason, OrderDetails } from '@/types';

type Message = {
  id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  local_only?: boolean;
  local_status?: 'error' | null;
};

const CLOSED_MESSAGE = 'This conversation has been closed.';

function isClosedMessage(message: Message | undefined) {
  return message?.sender_type === 'system' && message.content.trim() === CLOSED_MESSAGE;
}

function sortMessages(incoming: Message[]) {
  return [...incoming].sort((a, b) => {
    const at = Date.parse(a.created_at);
    const bt = Date.parse(b.created_at);
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });
}

function getClientMessageId(message: Message): string | null {
  const meta = message.metadata;
  if (!meta || typeof meta !== 'object') return null;
  const v = (meta as any).client_message_id;
  return typeof v === 'string' ? v : null;
}

function messagesRoughlyMatch(a: Message, b: Message) {
  if (a.sender_type !== b.sender_type) return false;
  if (a.content.trim() !== b.content.trim()) return false;
  const at = Date.parse(a.created_at);
  const bt = Date.parse(b.created_at);
  if (!Number.isFinite(at) || !Number.isFinite(bt)) return false;
  return Math.abs(at - bt) <= 8000;
}

export function ChatWindow({
  caseId,
  mode,
  caseStatus,
  disputeType,
  intakeReason,
}: {
  caseId: string;
  mode: 'customer' | 'agent';
  caseStatus?: CaseStatus | string;
  disputeType?: DisputeType;
  intakeReason?: IntakeReason | null;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [focused, setFocused] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [orderDetails, setOrderDetails] = React.useState<OrderDetails | null>(null);

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    const res = await api.get<{ messages: Message[] }>(`/cases/${caseId}/messages`);

    setMessages((prev) => {
      const serverMessages = sortMessages(res.messages);
      const serverRemaining: Message[] = [...serverMessages];

      const localOnly = prev.filter((m) => m.local_only);
      const reconciledLocals: Message[] = [];

      for (const local of localOnly) {
        const localClientId = getClientMessageId(local);

        let matchedIndex = -1;
        if (localClientId) {
          matchedIndex = serverRemaining.findIndex((m) => getClientMessageId(m) === localClientId);
        }
        if (matchedIndex < 0) {
          matchedIndex = serverRemaining.findIndex((m) => messagesRoughlyMatch(local, m));
        }

        if (matchedIndex >= 0) {
          const server = serverRemaining.splice(matchedIndex, 1)[0];
          reconciledLocals.push(server);
        } else {
          reconciledLocals.push(local);
        }
      }

      return sortMessages([...serverRemaining, ...reconciledLocals]);
    });
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (mode !== 'customer') return;
    customerApi.getOrderDetails(caseId).then(setOrderDetails).catch(() => setOrderDetails(null));
  }, [caseId, mode]);

  React.useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  React.useEffect(() => {
    if (!focused) return;

    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      await load();
      if (cancelled) return;

      const fast = 1000;
      const slow = BUSINESS_RULES.CHAT_POLL_INTERVAL_MS;

      const last = messages[messages.length - 1];
      const hasHuman =
        messages.some((m) => m.sender_type === 'agent') ||
        messages.some((m) => m.sender_type === 'system' && m.content.toLowerCase().includes('has joined the conversation'));

      const waitingOnAi =
        mode === 'customer' &&
        !hasHuman &&
        caseStatus === 'pending_triage' &&
        last?.sender_type === 'customer';

      const customerIdle = 2000;

    const delay =
      sending || hasHuman || waitingOnAi
        ? fast
        : mode === 'customer' && caseStatus !== 'closed'
          ? Math.min(slow, customerIdle)
          : slow;
      timer = window.setTimeout(() => void tick(), delay);
    };

    timer = window.setTimeout(() => void tick(), 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [caseStatus, focused, load, messages, mode, sending]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const joinMessage = messages.find(
    (message) =>
      message.sender_type === 'system' &&
      message.content.toLowerCase().includes('has joined the conversation')
  );
  const joinedNameRaw = joinMessage?.content.split('has joined the conversation')[0]?.trim() ?? null;
  const joinedName = joinedNameRaw ? joinedNameRaw.replace(/^agent\s+/i, '') : null;
  const humanJoined = messages.some((message) => message.sender_type === 'agent') || Boolean(joinMessage);

  const lastMessage = messages[messages.length - 1];
  const lastAiMessage = [...messages].reverse().find((message) => message.sender_type === 'ai');
  const isClosed = caseStatus === 'closed';

  const awaitingAiReply =
    mode === 'customer' &&
    !humanJoined &&
    caseStatus === 'pending_triage' &&
    lastMessage?.sender_type === 'customer';

  const structuredConfig = React.useMemo(() => {
    if (
      !(
        mode === 'customer' &&
        disputeType &&
        caseStatus === 'pending_triage' &&
        !humanJoined &&
        lastAiMessage &&
        lastAiMessage.id === lastMessage?.id
      )
    ) {
      return null;
    }

    return getStructuredConfig({
      question: lastAiMessage.content,
      disputeType,
      intakeReason: intakeReason ?? null,
      orderDetails,
      multiSelect:
        lastAiMessage.content.toLowerCase().includes('which items') ||
        lastAiMessage.content.toLowerCase().includes('what items'),
    });
  }, [caseStatus, disputeType, humanJoined, intakeReason, lastAiMessage, lastMessage?.id, mode, orderDetails]);

  const showStructured = Boolean(structuredConfig && lastAiMessage);
  const participantState = isClosed ? 'closed' : humanJoined ? 'human' : mode === 'customer' ? 'ai' : 'human';

  const intakeLabel = React.useMemo(() => {
    if (!intakeReason) return null;
    const option = INTAKE_ISSUE_OPTIONS.find((o) => o.intakeReason === intakeReason);
    if (option?.label) return option.label;
    if (intakeReason === 'other_delivery') return 'Something else';
    return null;
  }, [intakeReason]);

  const disputeLabel = disputeType ? (disputeType === 'refund' ? 'Refund' : 'Delivery') : null;
  const orderLabel = mode === 'customer' ? (orderDetails?.order_id ?? null) : null;

  const inputDisabled = isClosed || sending || awaitingAiReply || showStructured;

  const placeholder = isClosed
    ? 'This conversation has been closed.'
    : showStructured
      ? 'Select an option above...'
      : awaitingAiReply
        ? 'ROAR is reviewing your message...'
        : mode === 'customer'
          ? 'Type a message...'
          : 'Reply to customer...';

  const onSend = async (text: string) => {
    const clientMessageId = crypto.randomUUID();

    const localMessage: Message = {
      id: `local:${clientMessageId}`,
      sender_type: mode === 'customer' ? 'customer' : 'agent',
      content: text,
      created_at: new Date().toISOString(),
      metadata: { client_message_id: clientMessageId },
      local_only: true,
      local_status: null,
    };

    setMessages((prev) => sortMessages([...prev, localMessage]));

    setSending(true);
    try {
      await api.post(`/cases/${caseId}/messages`, {
        content: text,
        sender_type: mode === 'customer' ? 'customer' : 'agent',
        metadata: { client_message_id: clientMessageId },
      });
      await load();
    } catch {
      setMessages((prev) =>
        prev.map((m) => {
          const cid = getClientMessageId(m);
          if (m.local_only && cid === clientMessageId) {
            return { ...m, local_status: 'error' };
          }
          return m;
        })
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border-default bg-bg-surface">
      <ParticipantBanner state={participantState} agentName={humanJoined ? (joinedName ?? 'Agent') : undefined} />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {mode === 'customer' && (orderLabel || intakeLabel || disputeLabel) ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {orderLabel ? (
              <span className="rounded-pill border border-border-default bg-bg-sunken px-3 py-1 text-[12px] text-text-secondary">
                Order: {orderLabel}
              </span>
            ) : null}
            {intakeLabel ? (
              <span className="rounded-pill border border-border-default bg-bg-sunken px-3 py-1 text-[12px] text-text-secondary">
                Issue: {intakeLabel}
              </span>
            ) : null}
            {disputeLabel ? (
              <span className="rounded-pill border border-border-default bg-bg-sunken px-3 py-1 text-[12px] text-text-secondary">
                Dispute: {disputeLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {messages.map((message) => (
          <React.Fragment key={message.id}>
            <ChatBubble
              senderType={message.sender_type}
              content={message.content}
              createdAt={message.created_at}
              status={message.local_status ?? undefined}
            />
            {showStructured && lastAiMessage?.id === message.id && disputeType ? (
              <StructuredResponse
                question={lastAiMessage.content}
                caseId={caseId}
                disputeType={disputeType}
                intakeReason={intakeReason ?? null}
                orderDetails={orderDetails}
                onSend={onSend}
                multiSelect={Boolean(structuredConfig?.multiSelect)}
              />
            ) : null}
          </React.Fragment>
        ))}

        {awaitingAiReply && !isClosed ? (
          <div className="my-2 flex justify-start">
            <div className="rounded-[16px_16px_16px_4px] bg-bg-elevated px-[14px] py-[10px]">
              <TypingIndicator />
            </div>
          </div>
        ) : null}
      </div>

      <ChatInput onSend={onSend} disabled={inputDisabled} placeholder={placeholder} />
    </div>
  );
}
