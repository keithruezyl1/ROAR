'use client';

import * as React from 'react';

export type StructuredOption = {
  label: string;
  value: string;
};

export function StructuredResponse({
  prompt,
  options,
  onSelect,
  disabled,
}: {
  prompt: string;
  options: StructuredOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div className="my-3 flex flex-col items-start gap-2">
      <div className="text-[13px] font-medium text-text-secondary">{prompt}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled || selected !== null}
            onClick={() => {
              setSelected(opt.value);
              onSelect(opt.value);
            }}
            className={`rounded-pill px-3 py-1.5 text-[13px] font-medium transition-colors duration-instant ${
              selected === opt.value
                ? 'bg-primary text-text-inverse'
                : selected !== null
                  ? 'border border-border-default bg-bg-sunken text-text-muted opacity-50'
                  : 'border border-border-default bg-bg-sunken text-text-secondary hover:border-border-strong hover:bg-bg-surface'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
