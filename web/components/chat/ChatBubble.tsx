'use client';

import * as React from 'react';
import clsx from 'clsx';

export type SenderType = 'customer' | 'ai' | 'agent' | 'system';

export function ChatBubble({
  senderType,
  content,
  createdAt,
}: {
  senderType: SenderType;
  content: string;
  createdAt?: string;
}) {
  const [hover, setHover] = React.useState(false);

  if (senderType === 'system') {
    return <div className="my-2 flex justify-center text-[11px] text-text-muted">{content}</div>;
  }

  const align = senderType === 'customer' ? 'justify-end' : 'justify-start';

  const bubble =
    senderType === 'customer'
      ? 'bg-primary text-text-inverse rounded-[16px_16px_4px_16px]'
      : senderType === 'agent'
        ? 'bg-primary-subtle text-text-primary rounded-[16px_16px_16px_4px]'
        : 'bg-bg-elevated text-text-primary rounded-[16px_16px_16px_4px]';

  return (
    <div
      className={clsx('my-2 flex', align)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="max-w-[72%]">
        <div className={clsx('px-[14px] py-[10px] text-[15px]', bubble)}>{content}</div>
        {createdAt && hover ? (
          <div className="mt-1 text-[11px] text-text-muted">{new Date(createdAt).toLocaleString()}</div>
        ) : null}
      </div>
    </div>
  );
}
