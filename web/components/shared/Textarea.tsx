import * as React from 'react';
import clsx from 'clsx';

export function Textarea({
  label,
  error,
  className,
  disabled,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
}) {
  const hasValue = props.value != null && String(props.value).length > 0;

  const base =
    'w-full resize-y rounded-input border bg-bg-sunken px-3 py-2 text-[15px] text-text-primary placeholder:text-text-muted transition-colors duration-instant';

  const border = error
    ? 'border-danger bg-danger-bg'
    : hasValue
      ? 'border-border-strong'
      : 'border-border-default';

  const focus = error
    ? 'focus:border-danger focus:ring-0'
    : 'focus:border-border-focus focus:border-2 focus:bg-bg-elevated focus:outline-none';

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={clsx('flex flex-col', className)}>
      <label className={clsx('mb-[6px] text-[13px] font-normal', error ? 'text-danger' : 'text-text-secondary')}>
        {label}
      </label>
      <textarea disabled={disabled} {...props} className={clsx(base, border, focus, disabledStyles)} />
      {error ? (
        <div className="mt-1 text-[13px] text-danger">{error}</div>
      ) : null}
    </div>
  );
}
