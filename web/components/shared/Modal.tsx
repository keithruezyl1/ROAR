'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import { Button } from './Button';

function getFocusable(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter((el) => !el.hasAttribute('disabled'));
}

export function Modal({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = getFocusable(panel);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // focus first focusable after open
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusable(panel);
      (focusables[0] ?? panel).focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = priorOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={clsx(
            'w-full rounded-modal bg-bg-elevated shadow-[0_4px_16px_rgba(0,0,0,0.08)] outline-none',
            'transition duration-fast',
            'animate-[roar-modal-in_150ms_cubic-bezier(0.34,1.56,0.64,1)_both]',
            wide ? 'max-w-[640px]' : 'max-w-[480px]'
          )}
        >
          <div className="flex items-center justify-between border-b border-border-default p-6">
            <div className="text-[20px] font-semibold text-text-primary">{title}</div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
              ×
            </Button>
          </div>
          <div className="p-6 text-[15px] text-text-primary">{children}</div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes roar-modal-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\[roar-modal-in_150ms_cubic-bezier\(0\.34\,1\.56\,0\.64\,1\)_both\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
