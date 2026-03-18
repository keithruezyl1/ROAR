-- Refund and return request records

CREATE TABLE refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id),
    order_id TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id),
    order_id TEXT NOT NULL,
    item_ids TEXT[] NOT NULL,
    return_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL UNIQUE REFERENCES cases(id),
    dispute_type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    order_id TEXT NOT NULL,
    intent_classification TEXT NOT NULL,
    data_sources_queried TEXT[] NOT NULL,
    policies_applied TEXT[] NOT NULL,
    slas_applied TEXT[] NOT NULL,
    triage_decision JSONB NOT NULL,
    resolution_path TEXT NOT NULL,
    approval_outcome TEXT CHECK (approval_outcome IN ('approved', 'rejected')),
    rejection_reason TEXT,
    resolution_actions JSONB,
    outcome_summary TEXT NOT NULL,
    close_reason TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

