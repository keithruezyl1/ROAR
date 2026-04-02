'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';

export function ChatInput({
  onSend,
  disabled,
  placeholder,
  stateHint,
}: {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  stateHint?: string | null;
}) {
  const [value, setValue] = React.useState('');

  const send = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    await onSend(text);
  };

  return (
    <div className="border-t border-border-default bg-bg-surface p-4">
      {stateHint ? <div className="mb-2 text-[12px] text-text-secondary">{stateHint}</div> : null}
      <div className="flex items-end gap-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? 'Type a message...'}
          className="min-h-11 max-h-36 flex-1 resize-y rounded-input border border-border-default bg-bg-sunken px-3 py-2 text-[15px] text-text-primary placeholder:text-text-muted focus:border-2 focus:border-border-focus focus:bg-bg-elevated focus:outline-none disabled:cursor-not-allowed disabled:opacity-55"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={() => void send()} disabled={disabled} className="h-11 min-w-[84px]">
          Send
        </Button>
      </div>
    </div>
  );
}
