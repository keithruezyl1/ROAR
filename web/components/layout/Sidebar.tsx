'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

type NavLink = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
};

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.34-5.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PoliciesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17.5A2.5 2.5 0 0 0 17.5 17H5.5A2.5 2.5 0 0 1 3 14.5v-7A3 3 0 0 1 6 4.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7h9M7 11h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon({ className, collapsed }: { className?: string; collapsed: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar({
  role,
  collapsed,
  onToggleCollapsed,
  onRequestLogout,
}: {
  role: 'approver' | 'escalation';
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onRequestLogout: () => void;
}) {
  const pathname = usePathname();

  const links: NavLink[] =
    role === 'approver'
      ? [
          { href: '/approver', label: 'Dashboard', icon: DashboardIcon },
          { href: '/approver/replacements', label: 'Replacements', icon: HistoryIcon },
          { href: '/approver/refunds', label: 'History', icon: HistoryIcon },
          { href: '/policies', label: 'Policies', icon: PoliciesIcon },
        ]
      : [
          { href: '/escalation', label: 'Dashboard', icon: DashboardIcon },
          { href: '/policies', label: 'Policies', icon: PoliciesIcon },
        ];

  const loggedInPillClass =
    role === 'approver'
      ? 'border-[#B79BFF] bg-[#F2EDFF] text-[#5B2BC4] dark:border-[#6842C2] dark:bg-[#2A1A4A] dark:text-[#C9B6FF]'
      : 'border-[#8FD9A8] bg-[#EAF8EF] text-[#1E7A3F] dark:border-[#2E7D4E] dark:bg-[#11301E] dark:text-[#86D9A8]';

  return (
    <aside
      style={{ width: collapsed ? 82 : 260 }}
      className="flex min-h-screen shrink-0 flex-col overflow-hidden border-r border-border-default bg-bg-surface p-3 transition-[width] duration-normal ease-in-out"
    >
      <div className={clsx('mb-5 flex gap-3', collapsed ? 'justify-center' : 'items-start')}>
        <Image src="/roar-logo.png" alt="ROAR logo" width={38} height={38} className="h-9 w-9 rounded-btn object-cover" />

        <div
          className={clsx(
            'overflow-hidden transition-all duration-fast',
            collapsed ? 'max-w-0 translate-x-[-6px] opacity-0' : 'max-w-[170px] translate-x-0 opacity-100'
          )}
        >
          <div className="whitespace-nowrap text-[15px] font-semibold leading-tight">ROAR Engine</div>
          <div className="-mt-0.5 whitespace-nowrap text-[13px] font-normal leading-none text-text-muted">Admin Console</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={clsx(
            'flex items-center rounded-btn px-3 py-2 text-[15px] font-medium text-text-secondary transition-colors duration-instant hover:bg-bg-sunken hover:text-text-primary',
            collapsed ? 'justify-center px-2' : 'gap-2.5'
          )}
        >
          <CollapseIcon className="h-[18px] w-[18px] shrink-0" collapsed={collapsed} />
          {!collapsed ? <span>Collapse Sidebar</span> : null}
        </button>

        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'group flex items-center rounded-btn px-3 py-2 text-[15px] font-medium transition-colors duration-instant',
                collapsed ? 'justify-center px-2' : 'gap-2.5',
                active
                  ? 'bg-primary-subtle text-text-primary'
                  : 'text-text-secondary hover:bg-bg-sunken hover:text-text-primary'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed ? <span>{link.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 pt-4">
        <div
          className={clsx(
            'overflow-hidden transition-all duration-fast',
            collapsed ? 'max-h-0 max-w-0 opacity-0' : 'max-h-10 max-w-[220px] opacity-100'
          )}
        >
          <div className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-[3px] text-[11px] font-semibold', loggedInPillClass)}>
            <span>{role === 'approver' ? 'Logged in as Approver' : 'Logged in as Escalation Team'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRequestLogout}
          className={clsx(
            'inline-flex items-center rounded-btn border border-border-default bg-bg-elevated text-[14px] font-medium text-text-secondary transition-colors duration-fast',
            'hover:border-primary hover:bg-primary hover:text-text-inverse',
            collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full max-w-[210px] justify-center gap-2.5'
          )}
        >
          <LogoutIcon className="h-4 w-4" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}
