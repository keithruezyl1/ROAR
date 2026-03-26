'use client';

import * as React from 'react';
import Image from 'next/image';

import { DarkModeToggle } from '../shared/DarkModeToggle';
import { decodeJwtPayload } from '@/lib/jwt';

export function TopBar({
  role,
  title,
  titleMeta,
}: {
  role: 'approver' | 'escalation';
  title: string;
  titleMeta?: React.ReactNode;
}) {
  const [fullName, setFullName] = React.useState<string>('');

  React.useEffect(() => {
    const token = localStorage.getItem('roar_token');
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (payload?.full_name) setFullName(payload.full_name);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-default bg-bg-surface px-6">
      <div className="flex items-center gap-3">
        <div className="text-[24px] font-bold leading-none">{title}</div>
        {titleMeta ?? null}
      </div>

      <div className="flex items-center gap-3">
        {fullName ? (
          <div className="flex items-center gap-2">
            {role === 'approver' ? (
              <Image
                src="/approverpfp.png"
                alt="Approver profile"
                width={26}
                height={26}
                className="h-[26px] w-[26px] rounded-pill object-cover"
              />
            ) : (
              <Image
                src="/escalationpfp.png"
                alt="Escalation profile"
                width={26}
                height={26}
                className="h-[26px] w-[26px] rounded-pill object-cover"
              />
            )}
            <div className="text-[13px] text-text-secondary">{fullName}</div>
          </div>
        ) : null}
        <DarkModeToggle />
      </div>
    </header>
  );
}
