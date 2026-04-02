'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';

export function ChatInput({
  onSend,
  onAttachFiles,
  disabled,
  placeholder,
  stateHint,
}: {
  onSend: (text: string) => Promise<void> | void;
  onAttachFiles?: (files: File[]) => Promise<void> | void;
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
        {onAttachFiles ? (
          <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[16px] border border-border-default bg-bg-elevated text-text-secondary transition-colors hover:bg-bg-sunken hover:text-text-primary">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path d="M8.5 12.5l6.8-6.8a3 3 0 114.2 4.2l-8.2 8.2a5 5 0 11-7.1-7.1l8.5-8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={disabled}
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) {
                  void onAttachFiles(files);
                }
                event.currentTarget.value = '';
              }}
            />
          </label>
        ) : null}
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
