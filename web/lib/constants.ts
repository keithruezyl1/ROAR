export const BUSINESS_RULES = {
  REFUND_AUTO_THRESHOLD: 500,          // THB
  RETURN_WINDOW_DAYS: 7,
  DELIVERY_SLA_BREACH_DAYS: 3,
  INACTIVITY_TIMEOUT_MINUTES: 15,
  MIN_REJECTION_REASON_CHARS: 50,
  MAX_INTAKE_QUESTIONS: 3,
  CHAT_POLL_INTERVAL_MS: 4000,
  CHAT_TRANSCRIPT_MAX_MSGS: 40,
} as const;

export const CASE_STATUS_LABELS: Record<string, string> = {
  pending_triage: 'Pending triage',
  awaiting_approval: 'Awaiting approval',
  approved_executing: 'Executing',
  rejected_human_required: 'Rejected — human required',
  escalated_human_required: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const AGENT_CLOSE_REASONS = [
  { value: 'resolved', label: 'Resolved — issue handled' },
  { value: 'unresponsive', label: 'Customer unresponsive / abandoned' },
  { value: 'duplicate', label: 'Duplicate — already has an open case' },
] as const;

export const DISPUTE_TYPE_LABELS = {
  refund: 'Refund',
  delivery: 'Delivery',
} as const;

