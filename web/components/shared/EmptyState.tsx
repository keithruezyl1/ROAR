import * as React from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-bg-surface p-8 text-center">
      <div className="mb-3 text-text-secondary">{icon}</div>
      <div className="text-[17px] font-semibold text-text-primary">{title}</div>
      <div className="mt-2 max-w-[420px] text-[15px] text-text-secondary">{description}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
