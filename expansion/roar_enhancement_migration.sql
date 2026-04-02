-- ROAR Enhancement Migration
-- Adds support for: dispute subtypes, resolution preferences, replacement tracking
-- Run date: 2026-03-27

-- 1. Add new columns to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS dispute_subtype TEXT,
ADD COLUMN IF NOT EXISTS resolution_preference TEXT CHECK (resolution_preference IN ('refund', 'replacement'));

-- 2. Create return_requests table for tracking replacements and returns
CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('replacement', 'return')),
    items JSONB NOT NULL, -- [{item_id, product_name, quantity, unit_price}]
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_return_requests_case_id ON return_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);

-- 3. Add inventory availability tracking to information_bundle
-- (No schema change needed - information_bundle is JSONB, we'll just populate it differently)

-- 4. Seed comment for tracking
COMMENT ON COLUMN cases.dispute_subtype IS 'Specific dispute classification: damaged_goods, wrong_item, partial_fulfillment, quality_issue, non_receipt';
COMMENT ON COLUMN cases.resolution_preference IS 'Customer preference: refund or replacement';
COMMENT ON TABLE return_requests IS 'Tracks replacement orders and return requests created during dispute resolution';
