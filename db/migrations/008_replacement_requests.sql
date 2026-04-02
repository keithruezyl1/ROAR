-- Replacement request records

CREATE TABLE replacement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id),
    order_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executing', 'completed', 'rejected', 'cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    reason TEXT NOT NULL,
    replacement_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    eligible_amount NUMERIC(10,2),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_replacement_requests_case_id ON replacement_requests(case_id);
CREATE INDEX idx_replacement_requests_order_id ON replacement_requests(order_id);
CREATE INDEX idx_replacement_requests_status ON replacement_requests(status);