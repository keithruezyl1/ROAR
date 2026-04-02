'use client';

import * as React from 'react';
import clsx from 'clsx';

import { api, customerApi } from '@/lib/api';
import { decodeToken } from '@/lib/auth';
import { BUSINESS_RULES } from '@/lib/constants';
import { INTAKE_ISSUE_OPTIONS } from '@/lib/intakeContext';
import { ChatBubble, type SenderType } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ParticipantBanner } from './ParticipantBanner';
import { TypingIndicator } from './TypingIndicator';
import { StructuredResponse, getStructuredConfig } from './StructuredResponse';
import { Button } from '@/components/shared/Button';
import type { CaseStatus, DisputeType, IntakeReason, OrderDetails, ResolutionPreference } from '@/types';

type Message = {
  id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  local_only?: boolean;
  local_status?: 'error' | null;
};

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
  const v = (meta as Record<string, unknown>).client_message_id;
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

function isItemSelectionPrompt(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('which items') ||
    normalized.includes('what items') ||
    (
      (normalized.includes('which item') || normalized.includes('what item') || normalized.includes('items') || normalized.includes('item')) &&
      (
        normalized.includes('missing') ||
        normalized.includes('damaged') ||
        normalized.includes('wrong') ||
        normalized.includes('affected') ||
        normalized.includes('received')
      )
    )
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d={open ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatWindow({
  caseId,
  mode,
  caseStatus,
  disputeType,
  intakeReason,
  resolutionPreference,
  onGoToCases,
  onStartNewDispute,
}: {
  caseId: string;
  mode: 'customer' | 'agent';
  caseStatus?: CaseStatus | string;
  disputeType?: DisputeType;
  intakeReason?: IntakeReason | null;
  intakeMessage?: string | null;
  resolutionPreference?: ResolutionPreference | null;
  onGoToCases?: () => void;
  onStartNewDispute?: () => void;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [focused, setFocused] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [orderDetails, setOrderDetails] = React.useState<OrderDetails | null>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const [unseenCount, setUnseenCount] = React.useState(0);
  const [contextCondensed, setContextCondensed] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = React.useRef(0);
  const currentUserRole = React.useMemo(() => decodeToken()?.role ?? null, []);

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

    const threshold = 36;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setUnseenCount(0);
      setAtBottom(true);
    }
  }, [messages.length]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 36;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      setAtBottom(nearBottom);
      if (nearBottom) setUnseenCount(0);
      setContextCondensed(el.scrollTop > 12);
    };

    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    const previous = previousMessageCountRef.current;
    if (messages.length > previous && previous > 0 && !atBottom) {
      setUnseenCount((count) => count + (messages.length - previous));
    }
    previousMessageCountRef.current = messages.length;
  }, [atBottom, messages.length]);

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
      multiSelect: isItemSelectionPrompt(lastAiMessage.content),
    });
  }, [caseStatus, disputeType, humanJoined, intakeReason, lastAiMessage, lastMessage?.id, mode, orderDetails]);

  const showStructured = Boolean(structuredConfig && lastAiMessage);
  const participantState = isClosed ? 'closed' : humanJoined ? 'human' : mode === 'customer' ? 'ai' : 'human';

  const intakeLabel = React.useMemo(() => {
    if (!intakeReason) return null;
    const option = INTAKE_ISSUE_OPTIONS.find((o) => o.id === intakeReason);
    return option?.label ?? null;
  }, [intakeReason]);

  const issueTypeLabel = disputeType ? (disputeType === 'refund' ? 'Refund issue' : 'Delivery issue') : null;
  const resolutionLabel = resolutionPreference
    ? (resolutionPreference === 'replacement' ? 'Replacement' : resolutionPreference === 'return' ? 'Return' : 'Refund')
    : issueTypeLabel;
  const resolutionLabelTitle = resolutionPreference ? 'Requested resolution' : 'Issue type';
  const orderLabel = mode === 'customer' ? (orderDetails?.order_id ?? null) : null;
  const orderItemsLabel = React.useMemo(() => {
    if (!orderDetails?.items?.length) return null;
    const names = orderDetails.items.map((item) =>
      item.quantity > 1 ? `${item.item_name} x${item.quantity}` : item.item_name
    );
    if (names.length <= 2) return names.join(', ');
    return `${names[0]}, ${names[1]} (+${names.length - 2} more)`;
  }, [orderDetails]);

  const inputDisabled = isClosed || sending || awaitingAiReply || showStructured;
  const showComposer = !isClosed && !showStructured && !awaitingAiReply;

  const placeholder = isClosed
    ? 'Conversation closed'
    : showStructured
      ? 'Select an option above...'
      : awaitingAiReply
        ? 'RAI is reviewing your message...'
        : mode === 'customer'
          ? 'Type your message...'
          : 'Reply to customer...';

  const stateHint = isClosed
    ? null
    : showStructured
      ? 'Choose a structured response above to continue.'
      : awaitingAiReply
        ? 'RAI is preparing a response...'
        : sending
          ? 'Sending message...'
          : null;

  const onSend = async (text: string, metadata?: Record<string, unknown> | null) => {
    const clientMessageId = crypto.randomUUID();
    const normalizedMetadata = {
      ...(metadata ?? {}),
      client_message_id: clientMessageId,
    };

    const localMessage: Message = {
      id: `local:${clientMessageId}`,
      sender_type: mode === 'customer' ? 'customer' : 'agent',
      content: text,
      created_at: new Date().toISOString(),
      metadata: normalizedMetadata,
      local_only: true,
      local_status: null,
    };

    setMessages((prev) => sortMessages([...prev, localMessage]));

    setSending(true);
    try {
      await api.post(`/cases/${caseId}/messages`, {
        content: text,
        sender_type: mode === 'customer' ? 'customer' : 'agent',
        metadata: normalizedMetadata,
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

  const jumpToLatest = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setUnseenCount(0);
    setAtBottom(true);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-card border border-border-default bg-bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      <ParticipantBanner
        state={participantState}
        agentName={humanJoined ? (joinedName ?? 'Agent') : undefined}
        onBack={mode === 'customer' ? onGoToCases : undefined}
      />

      <div ref={scrollerRef} className="roar-scroll flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        <div className={clsx('sticky top-0 z-20 mb-3 rounded-btn bg-bg-base/95 px-3 py-2 backdrop-blur transition-all duration-fast', contextCondensed ? 'shadow-[0_4px_20px_rgba(0,0,0,0.08)]' : '')}>
          <div className="rounded-btn border border-border-default bg-bg-elevated">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-semibold text-text-primary"
            >
              <span>Case details</span>
              <ChevronIcon open={detailsOpen} />
            </button>

            {detailsOpen ? (
              <div className="grid gap-2 border-t border-border-default px-3 py-3 sm:grid-cols-2">
                <div className="rounded-btn bg-bg-sunken px-3 py-2">
                  <div className="text-[11px] text-text-muted">Order</div>
                  <div className="mt-1 text-[13px] font-medium text-text-primary">{orderLabel ?? '-'}</div>
                </div>
                <div className="rounded-btn bg-bg-sunken px-3 py-2">
                  <div className="text-[11px] text-text-muted">Issue</div>
                  <div className="mt-1 text-[13px] font-medium text-text-primary">{intakeLabel ?? '-'}</div>
                </div>
                <div className="rounded-btn bg-bg-sunken px-3 py-2">
                  <div className="text-[11px] text-text-muted">{resolutionLabelTitle}</div>
                  <div className="mt-1 text-[13px] font-medium text-text-primary">{resolutionLabel ?? '-'}</div>
                </div>
                <div className="rounded-btn bg-bg-sunken px-3 py-2">
                  <div className="text-[11px] text-text-muted">Order items</div>
                  <div className="mt-1 text-[13px] text-text-primary">{orderItemsLabel ?? '-'}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {messages.map((message) => (
          <React.Fragment key={message.id}>
            <ChatBubble
              senderType={message.sender_type}
              content={message.content}
              createdAt={message.created_at}
              status={message.local_status ?? undefined}
              currentUserRole={currentUserRole}
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
            <div className="rounded-[16px_16px_16px_4px] border border-border-default bg-bg-elevated px-[14px] py-[10px]">
              <TypingIndicator />
            </div>
          </div>
        ) : null}
      </div>

      {isClosed && mode === 'customer' ? (
        <div className="mx-4 mb-3 rounded-btn border border-warning bg-warning-bg p-3">
          <div className="text-[14px] font-semibold text-warning">Conversation Closed</div>
          <div className="mt-1 text-[13px] text-text-secondary">
            Your dispute is no longer accepting new messages. You can review history or start a new dispute.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {onGoToCases ? (
              <Button variant="secondary" size="sm" onClick={onGoToCases}>
                Go to cases
              </Button>
            ) : null}
            {onStartNewDispute ? (
              <Button variant="ghost" size="sm" onClick={onStartNewDispute}>
                Start new dispute
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showComposer ? (
        <ChatInput onSend={onSend} disabled={inputDisabled} placeholder={placeholder} stateHint={stateHint} />
      ) : null}

      {unseenCount > 0 && !atBottom ? (
        <div className={clsx('pointer-events-none absolute left-0 right-0 flex justify-center', showComposer ? 'bottom-[88px]' : 'bottom-6')}>
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto rounded-pill border border-primary-border bg-primary-subtle px-3 py-1 text-[12px] font-medium text-primary shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
          >
            {unseenCount} new {unseenCount === 1 ? 'message' : 'messages'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
