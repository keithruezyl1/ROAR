export type IntakeReason =
  | 'non_receipt'
  | 'delayed'
  | 'exception'
  | 'lost'
  | 'not_as_described'
  | 'damaged_goods'
  | 'wrong_item'
  | 'partial_fulfillment'
  | 'duplicate_charge'
  | 'return_request'
  | 'changed_mind'
  | 'other';

// Backward-compat legacy aliases still accepted by API normalization.
export type LegacyIntakeReason =
  | 'package_never_arrived'
  | 'delivery_late'
  | 'wrong_delivery_address'
  | 'quality_issue'
  | 'return_for_refund';

export type DisputeSubtype = IntakeReason | LegacyIntakeReason;
export type ResolutionPreference = 'refund' | 'replacement' | 'return';

// Case status enum
export type CaseStatus =
  | 'pending_triage'
  | 'awaiting_customer_proof'
  | 'awaiting_customer_decision'
  | 'awaiting_approval'
  | 'approved_executing'
  | 'rejected_human_required'
  | 'escalated_human_required'
  | 'resolved'
  | 'closed';

export type DisputeType = 'refund' | 'delivery';
export type ResolutionPath = 'autonomous' | 'escalation' | 'approval' | null;
export type SenderType = 'customer' | 'ai' | 'agent' | 'system';
export type UserRole = 'approver' | 'escalation' | 'customer';
export type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';
export type ClosedBy = 'customer' | 'agent' | 'timeout';
export type ProofAnalysisStatus = 'not_required' | 'required_pending' | 'processing' | 'completed' | 'failed';
export type InvalidReasonCode =
  | 'outside_return_window'
  | 'prior_refund_exists'
  | 'payment_not_confirmed'
  | 'non_returnable_item'
  | 'insufficient_proof'
  | 'proof_contradicts_claim'
  | 'tracking_shows_delivered'
  | 'amount_exceeds_limit'
  | 'unsupported_resolution_type'
  | 'policy_exception_requires_human_review';

export interface Case {
  id: string;
  reference_number: string;
  order_id: string;
  dispute_type: DisputeType;
  dispute_subtype: DisputeSubtype | null;
  resolution_preference: ResolutionPreference | null;
  customer_name: string;
  customer_email: string;
  intake_message: string;
  status: CaseStatus;
  resolution_path: ResolutionPath | null;
  assigned_to: string | null;
  triage_decision: TriageDecision | null;
  information_bundle: InformationBundle | null;
  resolution_plan: ResolutionPlan | null;
  proof_requirements: Record<string, unknown> | null;
  proof_analysis: ProofAnalysis | null;
  proof_analysis_status: ProofAnalysisStatus | null;
  invalid_reason_code: InvalidReasonCode | null;
  invalid_reason_detail: string | null;
  appeal_priority: 'normal' | 'urgent' | null;
  proof_uploads: CaseProofUpload[];
  evidence_bundle: EvidenceBundle | null;
  rejection_reason: string | null;
  escalation_summary: string | null;
  last_customer_message_at: string | null;
  closed_by: ClosedBy | null;
  close_reason: CloseReason | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface ChatMessage {
  id: string;
  case_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface EvidenceBundle {
  proof_present: boolean;
  proof_upload_count: number;
  proof_uploads: ProofAttachment[];
  proof_analysis_status: ProofAnalysisStatus | null;
  proof_analysis: ProofAnalysis | null;
  invalid_reason_code: InvalidReasonCode | null;
  invalid_reason_detail: string | null;
}

export interface TriageDecision {
  routing_decision: 'autonomous' | 'escalation' | 'awaiting_approval' | 'customer_response_required';
  rules_evaluated: Array<{
    rule: string;
    passed: boolean;
    evidence: string;
  }>;
  justification: string;
  policies_applied: string[];
  slas_applied: string[];
}

export interface InformationBundle {
  order: Record<string, unknown> | null;
  order_items: Record<string, unknown>[];
  transaction?: Record<string, unknown> | null;
  refund_records?: Record<string, unknown>[];
  shipment?: Record<string, unknown> | null;
  tracking_events?: Record<string, unknown>[];
  stock_records?: Record<string, unknown>[];
  proof_uploads?: ProofAttachment[];
  evidence_bundle?: EvidenceBundle | null;
  queried_at: string;
  dispute_type: DisputeType;
}

export interface ResolutionPlan {
  resolution_type: 'refund' | 'replacement' | 'return' | 'redelivery' | 'store_credit';
  amount: number | null;
  steps: string[];
  customer_message: string;
}

export interface Policy {
  id: string;
  category: 'store' | 'payment' | 'return' | 'delivery' | 'sla';
  title: string;
  slug: string;
  content: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
  full_name: string;
}

export interface CasesListResponse {
  cases: Case[];
  total: number;
}

export interface CaseReport {
  id: string;
  case_id: string;
  dispute_type: DisputeType;
  customer_name: string;
  customer_email: string;
  order_id: string;
  intent_classification: string;
  data_sources_queried: string[];
  policies_applied: string[];
  slas_applied: string[];
  triage_decision: Record<string, unknown>;
  resolution_path: string;
  approval_outcome: 'approved' | 'rejected' | null;
  rejection_reason: string | null;
  resolution_actions: Record<string, unknown> | null;
  evidence_bundle: EvidenceBundle | null;
  proof_uploads: ProofAttachment[] | null;
  outcome_summary: string;
  close_reason: string;
  generated_at: string;
}

export interface CustomerOrder {
  order_id: string;
  status: string;
  disputable: boolean;
  dispute_block_reason: string | null;
  total_amount: number;
  created_at: string;
  fulfilled_at: string | null;
  items: OrderItem[];
}

export interface ProofAnalysis {
  proof_present: boolean;
  image_count: number;
  items_visible: string[];
  observations: string[];
  damage_detected: {
    visible: boolean;
    type: 'physical_damage' | 'packaging_damage' | 'none';
    severity: 'minor' | 'moderate' | 'severe' | 'none';
    description: string;
  };
  wrong_item_signals: {
    detected: boolean;
    differences: string[];
  };
  missing_item_signals: {
    detected: boolean;
    empty_packaging: boolean;
  };
  not_as_described_signals: {
    detected: boolean;
    differences: string[];
  };
  confidence: number;
  limitations: string;
  analysis_version: string;
  model: string;
}

export interface CaseProofUpload {
  id: string;
  case_id: string;
  filename: string;
  content_type: string;
  byte_size: number;
  image_width: number | null;
  image_height: number | null;
  sort_order: number;
  created_at: string;
}

export interface ProofAttachment {
  proof_upload_id: string;
  filename: string;
  content_type: string;
  byte_size: number;
  image_width: number | null;
  image_height: number | null;
  sha256: string;
  sort_order: number;
  download_path: string;
  attachment_kind: 'image';
  created_at: string | null;
}

export interface OrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderDetails {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  transaction?: {
    status: string;
    amount: number;
    payment_method: string;
  };
  shipment?: {
    status: string;
    carrier: string;
    tracking_number: string;
    estimated_delivery: string;
  };
}

export type ReplacementRequestStatus =
  | 'pending'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ReplacementRequestItem {
  item_id?: string | null;
  sku?: string | null;
  quantity: number;
  product_name?: string | null;
  warehouse_location?: string | null;
  quantity_available_now?: number | null;
  unit_price?: number | null;
  order_id?: string | null;
}

export interface ReplacementRequest {
  id: string;
  case_id: string;
  order_id: string;
  status: ReplacementRequestStatus;
  requested_at: string;
  approved_at: string | null;
  executed_at: string | null;
  closed_at: string | null;
  reason: string;
  replacement_items: ReplacementRequestItem[];
  eligible_amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
