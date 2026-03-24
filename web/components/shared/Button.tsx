import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

import { LoadingSpinner } from './LoadingSpinner';

const buttonStyles = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-btn px-4 text-[15px] font-medium',
    'transition-colors duration-instant',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-text-inverse hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'bg-bg-surface text-text-primary border border-border-strong hover:bg-bg-sunken',
        danger: 'bg-danger-bg text-danger border border-danger hover:bg-[#F7C1C1]',
        ghost: 'bg-transparent text-text-secondary hover:bg-bg-sunken',
        link: 'bg-transparent text-primary hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3',
        default: 'h-9 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(buttonStyles({ variant, size }), className)}
    >
      {loading ? <LoadingSpinner size={size === 'lg' ? 'lg' : 'sm'} /> : children}
    </button>
  );
}
