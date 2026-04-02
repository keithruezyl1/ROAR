import clsx from 'clsx';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_triage: { bg: 'bg-info-bg', text: 'text-info', label: 'Pending triage' },
  awaiting_customer_proof: { bg: 'bg-warning-bg', text: 'text-warning', label: 'Awaiting your proof' },
  awaiting_customer_decision: { bg: 'bg-warning-bg', text: 'text-warning', label: 'Awaiting your decision' },
  awaiting_approval: { bg: 'bg-warning-bg', text: 'text-warning', label: 'Awaiting approval' },
  approved_executing: { bg: 'bg-primary-subtle', text: 'text-primary', label: 'Executing' },
  rejected_human_required: { bg: 'bg-danger-bg', text: 'text-danger', label: 'Rejected - human required' },
  escalated_human_required: { bg: 'bg-info-bg', text: 'text-info', label: 'Escalated' },
  resolved: { bg: 'bg-success-bg', text: 'text-success', label: 'Resolved' },
  closed: { bg: 'bg-bg-sunken', text: 'text-text-muted', label: 'Closed' },
};

export function CaseStatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    bg: 'bg-bg-sunken',
    text: 'text-text-muted',
    label: status,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-pill px-2 py-[3px] text-[11px] font-medium transition-colors duration-normal',
        style.bg,
        style.text
      )}
    >
      {style.label}
    </span>
  );
}
