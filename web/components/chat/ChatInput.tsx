'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';

export function ChatInput({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState('');

  const send = async () => {
    const text = value.trim();
    if (!text) return;
    setValue('');
    await onSend(text);
  };

  return (
    <div className="border-t border-border-default bg-bg-surface p-4">
      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? 'Type a message...'}
          className="h-10 flex-1 resize-none rounded-input border border-border-default bg-bg-sunken px-3 py-2 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:border-2 focus:bg-bg-elevated focus:outline-none disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={() => void send()} disabled={disabled}>
          Send
        </Button>
      </div>
    </div>
  );
}
