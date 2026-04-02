export const BUSINESS_RULES = {
  REFUND_AUTO_THRESHOLD: 500,          // THB
  RETURN_WINDOW_DAYS: 7,
  DELIVERY_SLA_BREACH_DAYS: 3,
  INACTIVITY_TIMEOUT_MINUTES: 15,
  MIN_REJECTION_REASON_CHARS: 50,
  MAX_INTAKE_QUESTIONS: 3,
  CHAT_POLL_INTERVAL_MS: 4000,
  CHAT_TRANSCRIPT_MAX_MSGS: 40,
  MAX_PROOF_UPLOADS: 2,
} as const;

export const CASE_STATUS_LABELS: Record<string, string> = {
  pending_triage: 'Pending triage',
  awaiting_customer_proof: 'Awaiting your proof',
  awaiting_customer_decision: 'Awaiting your decision',
  awaiting_approval: 'Awaiting approval',
  approved_executing: 'Executing',
  rejected_human_required: 'Rejected — human required',
  escalated_human_required: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const INVALID_REASON_LABELS: Record<string, string> = {
  outside_return_window: 'This case falls outside the allowed return or refund window.',
  prior_refund_exists: 'A prior refund already exists for this order.',
  payment_not_confirmed: 'Payment could not be confirmed for this order.',
  non_returnable_item: 'This item is not eligible for return.',
  insufficient_proof: 'The uploaded proof does not yet support this claim strongly enough.',
  proof_contradicts_claim: 'The uploaded proof appears inconsistent with the reported issue.',
  tracking_shows_delivered: 'Tracking records show this parcel as delivered.',
  amount_exceeds_limit: 'This case exceeds the current automatic handling limits.',
  unsupported_resolution_type: 'The requested resolution is not supported for this case.',
  policy_exception_requires_human_review: 'This case falls under a policy exception.',
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

