import * as React from 'react';
import clsx from 'clsx';

export function Select({
  label,
  error,
  className,
  disabled,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
}) {
  const hasValue = props.value != null && String(props.value).length > 0;

  const base =
    'w-full rounded-input border bg-bg-sunken px-3 text-[15px] text-text-primary transition-colors duration-instant';

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
      <select disabled={disabled} {...props} className={clsx(base, 'h-10', border, focus, disabledStyles)}>
        {children}
      </select>
      {error ? (
        <div className="mt-1 text-[13px] text-danger">{error}</div>
      ) : null}
    </div>
  );
}
