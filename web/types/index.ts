export type IntakeReason =
  | 'charged_but_received_nothing'
  | 'wrong_item'
  | 'damaged_item'
  | 'partial_order'
  | 'late_or_missing_delivery'
  | 'return_for_refund'
  | 'other_refund'
  | 'other_delivery';

// Case status enum
export type CaseStatus =
  | 'pending_triage'
  | 'awaiting_approval'
  | 'approved_executing'
  | 'rejected_human_required'
  | 'escalated_human_required'
  | 'resolved'
  | 'closed';

export type DisputeType = 'refund' | 'delivery';
export type ResolutionPath = 'autonomous' | 'escalation';
export type SenderType = 'customer' | 'ai' | 'agent' | 'system';
export type UserRole = 'approver' | 'escalation' | 'customer';
export type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';
export type ClosedBy = 'customer' | 'agent' | 'timeout';

export interface Case {
  id: string;
  reference_number: string;
  order_id: string;
  dispute_type: DisputeType;
  customer_name: string;
  customer_email: string;
  intake_message: string;
  status: CaseStatus;
  resolution_path: ResolutionPath | null;
  assigned_to: string | null;
  triage_decision: TriageDecision | null;
  information_bundle: InformationBundle | null;
  resolution_plan: ResolutionPlan | null;
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

export interface TriageDecision {
  routing_decision: 'autonomous' | 'escalation';
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
  queried_at: string;
  dispute_type: DisputeType;
}

export interface ResolutionPlan {
  resolution_type: 'refund' | 'replacement' | 'redelivery' | 'store_credit';
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
  triage_decision: 'autonomous' | 'escalation';
  resolution_path: string;
  approval_outcome: 'approved' | 'rejected' | null;
  rejection_reason: string | null;
  resolution_actions: string[] | null;
  outcome_summary: string;
  close_reason: string;
  generated_at: string;
}

export interface CustomerOrder {
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  fulfilled_at: string | null;
  items: OrderItem[];
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
