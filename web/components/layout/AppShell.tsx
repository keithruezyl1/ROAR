'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';

export function AppShell({
  role,
  title,
  titleMeta,
  children,
}: {
  role: 'approver' | 'escalation';
  title: string;
  titleMeta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const storageKey = `roar-sidebar-collapsed-${role}`;

  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  React.useEffect(() => {
    // Restore persisted state only after mount to avoid SSR/CSR hydration mismatch.
    setCollapsed(localStorage.getItem(storageKey) === '1');
    setHydrated(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, hydrated, storageKey]);

  const confirmLogout = React.useCallback(() => {
    localStorage.removeItem('roar_token');
    Cookies.remove('roar_token', { path: '/' });
    router.push('/login');
  }, [router]);

  return (
    <div className="h-screen overflow-hidden bg-bg-base text-text-primary">
      <div className="flex h-full">
        <Sidebar
          role={role}
          collapsed={hydrated ? collapsed : false}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onRequestLogout={() => setLogoutOpen(true)}
        />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <TopBar role={role} title={title} titleMeta={titleMeta} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log out now?"
      >
        <div className="flex flex-col gap-5">
          <p className="text-[14px] text-text-secondary">
            You will be signed out of ROAR Engine. You can log back in any time.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
              Go back
            </Button>
            <Button variant="primary" onClick={confirmLogout}>
              Yes, log out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
