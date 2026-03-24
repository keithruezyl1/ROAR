'use client';

import * as React from 'react';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({
  role,
  title,
  children,
}: {
  role: 'approver' | 'escalation';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="flex">
        <Sidebar role={role} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar role={role} title={title} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
