'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

import { DarkModeToggle } from '../shared/DarkModeToggle';
import { Button } from '../shared/Button';
import { decodeJwtPayload } from '@/lib/jwt';
import { RoleBadge } from './RoleBadge';

export function TopBar({
  role,
  title,
}: {
  role: 'approver' | 'escalation';
  title: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState<string>('');

  React.useEffect(() => {
    const token = localStorage.getItem('roar_token');
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (payload?.full_name) setFullName(payload.full_name);
  }, []);

  const logout = () => {
    localStorage.removeItem('roar_token');
    Cookies.remove('roar_token', { path: '/' });
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-default bg-bg-surface px-6">
      <div className="flex items-center gap-3">
        <div className="text-[24px] font-bold leading-none">{title}</div>
        <RoleBadge role={role} />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-[13px] text-text-secondary">{fullName}</div>
        <DarkModeToggle />
        <Button variant="secondary" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

