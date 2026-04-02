import type { DisputeSubtype, DisputeType, IntakeReason, ResolutionPreference } from '@/types';

export type IntakeIssueOption = {
  id: IntakeReason;
  label: string;
  category: 'delivery' | 'product' | 'order';
  disputeType: DisputeType;
  resolutionOptions: ResolutionPreference[];
};

export const INTAKE_ISSUE_OPTIONS: IntakeIssueOption[] = [
  {
    id: 'non_receipt',
    label: 'Package never arrived',
    category: 'delivery',
    disputeType: 'delivery',
    resolutionOptions: ['refund', 'replacement'],
  },
  {
    id: 'delayed',
    label: 'Delivery delayed',
    category: 'delivery',
    disputeType: 'delivery',
    resolutionOptions: ['refund'],
  },
  {
    id: 'exception',
    label: 'Delivery exception',
    category: 'delivery',
    disputeType: 'delivery',
    resolutionOptions: ['refund'],
  },
  {
    id: 'lost',
    label: 'Parcel lost',
    category: 'delivery',
    disputeType: 'delivery',
    resolutionOptions: ['refund', 'replacement'],
  },
  {
    id: 'not_as_described',
    label: 'Item not as described',
    category: 'product',
    disputeType: 'refund',
    resolutionOptions: ['refund', 'replacement'],
  },
  {
    id: 'damaged_goods',
    label: 'Received damaged item',
    category: 'product',
    disputeType: 'refund',
    resolutionOptions: ['refund', 'replacement'],
  },
  {
    id: 'wrong_item',
    label: 'Received wrong item',
    category: 'product',
    disputeType: 'refund',
    resolutionOptions: ['refund', 'replacement'],
  },
  {
    id: 'partial_fulfillment',
    label: 'Missing items (partial delivery)',
    category: 'order',
    disputeType: 'refund',
    resolutionOptions: ['refund'],
  },
  {
    id: 'duplicate_charge',
    label: 'Duplicate charge',
    category: 'order',
    disputeType: 'refund',
    resolutionOptions: ['refund'],
  },
  {
    id: 'return_request',
    label: 'I want to return this order',
    category: 'order',
    disputeType: 'refund',
    resolutionOptions: ['return'],
  },
  {
    id: 'changed_mind',
    label: 'Changed my mind',
    category: 'order',
    disputeType: 'refund',
    resolutionOptions: ['return'],
  },
  {
    id: 'other',
    label: 'Something else',
    category: 'order',
    disputeType: 'refund',
    resolutionOptions: ['refund'],
  },
];

export type StoredCaseContext = {
  intakeReason: IntakeReason;
  disputeType: DisputeType;
  disputeSubtype: DisputeSubtype | null;
  resolutionPreference: ResolutionPreference | null;
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

function getIssueOptionByLabel(label: string): IntakeIssueOption | null {
  return INTAKE_ISSUE_OPTIONS.find((option) => option.label === label) ?? null;
}

function mapLegacyReasonToCurrent(reason: string): IntakeReason {
  const map: Record<string, IntakeReason> = {
    charged_but_received_nothing: 'non_receipt',
    damaged_item: 'damaged_goods',
    partial_order: 'partial_fulfillment',
    late_or_missing_delivery: 'delayed',
    other_refund: 'other',
    other_delivery: 'other',
    package_never_arrived: 'non_receipt',
    delivery_late: 'delayed',
    wrong_delivery_address: 'exception',
    quality_issue: 'not_as_described',
    return_for_refund: 'return_request',
  };
  return map[reason] ?? (reason as IntakeReason);
}

export function deriveCaseContextFromCase(data: {
  intake_message: string;
  dispute_type: DisputeType;
  dispute_subtype?: string | null;
  resolution_preference?: string | null;
}): StoredCaseContext {
  const subtype = data.dispute_subtype ? (mapLegacyReasonToCurrent(data.dispute_subtype) as DisputeSubtype) : null;
  const bySubtype = subtype ? INTAKE_ISSUE_OPTIONS.find((o) => o.id === subtype) ?? null : null;
  if (bySubtype) {
    return {
      intakeReason: bySubtype.id,
      disputeType: bySubtype.disputeType,
      disputeSubtype: bySubtype.id,
      resolutionPreference: (data.resolution_preference as ResolutionPreference | null) ?? null,
    };
  }

  const byLabel = getIssueOptionByLabel(data.intake_message);
  if (byLabel) {
    return {
      intakeReason: byLabel.id,
      disputeType: byLabel.disputeType,
      disputeSubtype: byLabel.id,
      resolutionPreference: (data.resolution_preference as ResolutionPreference | null) ?? null,
    };
  }

  return {
    intakeReason: mapLegacyReasonToCurrent(data.dispute_type === 'delivery' ? 'other_delivery' : 'other_refund'),
    disputeType: data.dispute_type,
    disputeSubtype: subtype,
    resolutionPreference: (data.resolution_preference as ResolutionPreference | null) ?? null,
  };
}

export function issueRequiresProof(subtype: DisputeSubtype | null | undefined): boolean {
  return ['damaged_goods', 'wrong_item', 'not_as_described', 'partial_fulfillment'].includes(String(subtype ?? ''));
}
