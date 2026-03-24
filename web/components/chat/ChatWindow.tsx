'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { BUSINESS_RULES } from '@/lib/constants';
import { ChatBubble, type SenderType } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ParticipantBanner } from './ParticipantBanner';
import { TypingIndicator } from './TypingIndicator';
import { StructuredResponse, type StructuredOption } from './StructuredResponse';

type Message = {
  id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type PendingStructured = {
  prompt: string;
  options: StructuredOption[];
};

export function ChatWindow({
  caseId,
  mode,
}: {
  caseId: string;
  mode: 'customer' | 'agent';
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [focused, setFocused] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [inputDisabled, setInputDisabled] = React.useState(false);
  const [pendingStructured, setPendingStructured] = React.useState<PendingStructured | null>(null);

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    const res = await api.get<{ messages: Message[] }>(`/cases/${caseId}/messages`);
    setMessages(res.messages);

    // Check if last AI message requests structured input
    const lastMsg = res.messages[res.messages.length - 1];
    if (lastMsg?.sender_type === 'ai' && lastMsg.metadata) {
      const meta = lastMsg.metadata;
      if (meta.structured_options && Array.isArray(meta.structured_options)) {
        setPendingStructured({
          prompt: (meta.structured_prompt as string) || 'Please select an option:',
          options: meta.structured_options as StructuredOption[],
        });
        setInputDisabled(true);
      } else {
        setPendingStructured(null);
        setInputDisabled(false);
      }
    } else if (lastMsg?.sender_type === 'system') {
      // Chat closed
      setInputDisabled(true);
      setPendingStructured(null);
    } else {
      setPendingStructured(null);
      setInputDisabled(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

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
    const t = window.setInterval(() => void load(), BUSINESS_RULES.CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [focused, load]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onSend = async (text: string) => {
    setSending(true);
    try {
      await api.post(`/cases/${caseId}/messages`, {
        content: text,
        sender_type: mode === 'customer' ? 'customer' : 'agent',
      });
      await load();
    } finally {
      setSending(false);
    }
  };

  const onStructuredSelect = async (value: string) => {
    setPendingStructured(null);
    setInputDisabled(false);
    await onSend(value);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border-default bg-bg-surface">
      <ParticipantBanner state={mode === 'customer' ? 'ai' : 'human'} agentName={mode === 'agent' ? 'Agent' : undefined} />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.map((m) => (
          <ChatBubble key={m.id} senderType={m.sender_type} content={m.content} createdAt={m.created_at} />
        ))}
        {pendingStructured && mode === 'customer' ? (
          <StructuredResponse
            prompt={pendingStructured.prompt}
            options={pendingStructured.options}
            onSelect={onStructuredSelect}
            disabled={sending}
          />
        ) : null}
        {sending ? (
          <div className="my-2 flex justify-start">
            <div className="rounded-[16px_16px_16px_4px] bg-bg-elevated px-[14px] py-[10px]">
              <TypingIndicator />
            </div>
          </div>
        ) : null}
      </div>

      <ChatInput
        onSend={onSend}
        disabled={inputDisabled || sending}
        placeholder={
          inputDisabled
            ? pendingStructured ? 'Select an option above…' : 'Chat ended'
            : mode === 'customer' ? 'Type a message…' : 'Reply to customer…'
        }
      />
    </div>
  );
}
