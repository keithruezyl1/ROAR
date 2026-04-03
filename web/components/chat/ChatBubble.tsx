'use client';

import * as React from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ChatAttachmentGallery } from './ChatAttachmentGallery';
import type { ProofAttachment, UserRole } from '@/types';

export type SenderType = 'customer' | 'ai' | 'agent' | 'system';

type BubbleStatus = 'error' | null;

function formatTime(createdAt?: string) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-TH', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function getAvatarConfig(senderType: SenderType, currentUserRole?: UserRole | null) {
  if (senderType === 'customer') {
    return {
      label: 'Customer',
      src: '/customerpfp.jpg',
      fallbackClassName: 'bg-primary text-text-inverse',
      fallbackText: 'C',
    };
  }

  if (senderType === 'agent') {
    const src = currentUserRole === 'approver' ? '/approverpfp.png' : '/escalationpfp.png';
    const label = currentUserRole === 'approver' ? 'Approver' : 'Escalation';
    const fallbackText = currentUserRole === 'approver' ? 'A' : 'E';
    return {
      label,
      src,
      fallbackClassName: currentUserRole === 'approver' ? 'bg-info text-text-inverse' : 'bg-primary text-text-inverse',
      fallbackText,
    };
  }

  return {
    label: 'RAI',
    src: null,
    fallbackClassName: 'bg-primary text-text-inverse',
    fallbackText: 'RAI',
  };
}

export function ChatBubble({
  caseId,
  senderType,
  content,
  createdAt,
  status,
  currentUserRole,
  metadata,
}: {
  caseId: string;
  senderType: SenderType;
  content: string;
  createdAt?: string;
  status?: BubbleStatus;
  currentUserRole?: UserRole | null;
  metadata?: Record<string, unknown> | null;
}) {
  const timestamp = formatTime(createdAt);
  const attachments = Array.isArray(metadata?.attachments)
    ? (metadata?.attachments.filter((item): item is ProofAttachment => Boolean(item && typeof item === 'object' && 'proof_upload_id' in item)) as ProofAttachment[])
    : [];

  if (senderType === 'system') {
    return (
      <div className="my-3 flex justify-center">
        <div className="max-w-[92%] rounded-pill border border-border-default bg-bg-elevated px-3 py-1 text-center text-[12px] text-text-secondary">
          {content}
        </div>
      </div>
    );
  }

  const isOwnMessage =
    (senderType === 'customer' && currentUserRole === 'customer') ||
    (senderType === 'agent' && (currentUserRole === 'approver' || currentUserRole === 'escalation')) ||
    (!currentUserRole && senderType === 'customer');
  const avatar = getAvatarConfig(senderType, currentUserRole);

  const bubbleClass = isOwnMessage
    ? 'bg-primary text-text-inverse rounded-[18px_6px_18px_18px]'
    : 'bg-bg-elevated text-text-primary rounded-[6px_18px_18px_18px] border border-border-default';

  return (
    <div className={clsx('my-2.5 flex animate-[chat-msg-in_180ms_ease-out_both]', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div className={clsx('flex max-w-[86%] gap-2', isOwnMessage ? 'flex-row-reverse items-start' : 'flex-row items-start')}>
        <div
          className={clsx(
            'flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-pill text-[10px] font-semibold shadow-[0_1px_0_rgba(0,0,0,0.06)]',
            avatar.fallbackClassName
          )}
          aria-label={avatar.label}
          title={avatar.label}
        >
          {avatar.src ? (
            <Image src={avatar.src} alt={avatar.label} width={32} height={32} className="h-8 w-8 object-cover" />
          ) : (
            avatar.fallbackText
          )}
        </div>

        <div className="max-w-[calc(100%-40px)]">
          <div className={clsx('px-4 py-2.5 text-[16px] leading-relaxed shadow-[0_1px_0_rgba(0,0,0,0.06)]', bubbleClass)}>
            {content}
          </div>
          {attachments.length > 0 ? (
            <ChatAttachmentGallery caseId={caseId} attachments={attachments} alignRight={isOwnMessage} />
          ) : null}

          <div className={clsx('mt-1 flex items-center gap-2 text-[11px]', isOwnMessage ? 'justify-end' : 'justify-start')}>
            {status === 'error' ? <span className="text-danger">Message failed to send</span> : null}
            {timestamp ? <span className="text-text-muted">{timestamp}</span> : null}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes chat-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
