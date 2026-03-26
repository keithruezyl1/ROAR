'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function Sidebar({ role }: { role: 'approver' | 'escalation' }) {
  const pathname = usePathname();
  const links =
    role === 'approver'
      ? [
          { href: '/approver', label: 'Dashboard' },
          { href: '/approver/refunds', label: 'History' },
          { href: '/policies', label: 'Policies' },
        ]
      : [
          { href: '/escalation', label: 'Dashboard' },
          { href: '/policies', label: 'Policies' },
        ];

  return (
    <aside className="w-[240px] border-r border-border-default bg-bg-surface p-4 max-sm:w-[64px]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary text-text-inverse font-bold">
          R
        </div>
        <div className="max-sm:hidden">
          <div className="text-[15px] font-semibold">ROAR Engine</div>
          <div className="text-[13px] text-text-muted">Agent Console</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'rounded-btn px-3 py-2 text-[15px] font-medium transition-colors duration-instant',
                active ? 'bg-primary-subtle text-text-primary' : 'text-text-secondary hover:bg-bg-sunken',
                'max-sm:px-2 max-sm:text-[0px]'
              )}
            >
              <span className="max-sm:text-[15px]">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
