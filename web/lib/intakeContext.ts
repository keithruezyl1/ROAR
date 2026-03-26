import type { DisputeType, IntakeReason } from '@/types';

export type IntakeIssueOption = {
  label: string;
  intakeReason: IntakeReason;
  disputeType: DisputeType | null;
  requiresFreeform?: boolean;
};

export const INTAKE_ISSUE_OPTIONS: IntakeIssueOption[] = [
  { label: 'I was charged but received nothing', intakeReason: 'charged_but_received_nothing', disputeType: 'refund' },
  { label: 'I received the wrong item', intakeReason: 'wrong_item', disputeType: 'delivery' },
  { label: 'I received a damaged item', intakeReason: 'damaged_item', disputeType: 'refund' },
  { label: 'I only received part of my order', intakeReason: 'partial_order', disputeType: 'refund' },
  { label: "My delivery is late or hasn't arrived", intakeReason: 'late_or_missing_delivery', disputeType: 'delivery' },
  { label: 'I want to return an item for a refund', intakeReason: 'return_for_refund', disputeType: 'refund' },
  { label: 'Something else', intakeReason: 'other_refund', disputeType: null, requiresFreeform: true },
];

type StoredCaseContext = {
  intakeReason: IntakeReason;
  disputeType: DisputeType;
};

const STORAGE_KEY = 'roar_case_contexts';

function readContexts(): Record<string, StoredCaseContext> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredCaseContext>) : {};
  } catch {
    return {};
  }
}

function writeContexts(contexts: Record<string, StoredCaseContext>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contexts));
}

export function saveCaseContext(caseId: string, context: StoredCaseContext) {
  const contexts = readContexts();
  contexts[caseId] = context;
  writeContexts(contexts);
}

export function getCaseContext(caseId: string): StoredCaseContext | null {
  return readContexts()[caseId] ?? null;
}

export function getIssueOptionByLabel(label: string): IntakeIssueOption | null {
  return INTAKE_ISSUE_OPTIONS.find((option) => option.label === label) ?? null;
}

export function deriveCaseContextFromIntakeMessage(intakeMessage: string, disputeType: DisputeType): StoredCaseContext {
  const matched = getIssueOptionByLabel(intakeMessage);
  if (matched?.disputeType) {
    return { intakeReason: matched.intakeReason, disputeType: matched.disputeType };
  }

  return {
    intakeReason: disputeType === 'refund' ? 'other_refund' : 'other_delivery',
    disputeType,
  };
}
