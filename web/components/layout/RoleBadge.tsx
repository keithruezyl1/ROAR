export function RoleBadge({ role }: { role: 'approver' | 'escalation' }) {
  const styles =
    role === 'approver'
      ? 'bg-primary-subtle text-primary border-primary-border'
      : 'bg-info-bg text-info border-border-default';

  return (
    <span className={`rounded-pill border px-3 py-[3px] text-[11px] font-medium ${styles}`}>
      {role}
    </span>
  );
}
