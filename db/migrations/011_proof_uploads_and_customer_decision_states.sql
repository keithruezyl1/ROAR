-- Proof uploads, invalid-case customer decision states, and supporting metadata.

ALTER TABLE cases
DROP CONSTRAINT IF EXISTS cases_status_check;

ALTER TABLE cases
ADD CONSTRAINT cases_status_check
CHECK (
    status IN (
        'pending_triage',
        'awaiting_customer_proof',
        'awaiting_customer_decision',
        'awaiting_approval',
        'approved_executing',
        'rejected_human_required',
        'escalated_human_required',
        'resolved',
        'closed'
    )
);

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS proof_requirements JSONB,
ADD COLUMN IF NOT EXISTS proof_analysis JSONB,
ADD COLUMN IF NOT EXISTS proof_analysis_status VARCHAR(30),
ADD COLUMN IF NOT EXISTS invalid_reason_code VARCHAR(60),
ADD COLUMN IF NOT EXISTS invalid_reason_detail TEXT,
ADD COLUMN IF NOT EXISTS appeal_priority VARCHAR(20);

CREATE TABLE IF NOT EXISTS case_proof_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    byte_size INTEGER NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    sha256 VARCHAR(64) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_proof_uploads_case_id
ON case_proof_uploads (case_id, sort_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_proof_uploads_case_id_sha256
ON case_proof_uploads (case_id, sha256);

COMMENT ON COLUMN cases.proof_requirements IS 'Policy-evaluated proof requirements for the case.';
COMMENT ON COLUMN cases.proof_analysis IS 'Structured AI-generated evidence extraction from uploaded proof images.';
COMMENT ON COLUMN cases.proof_analysis_status IS 'Proof analysis lifecycle: not_required | required_pending | processing | completed | failed.';
COMMENT ON COLUMN cases.invalid_reason_code IS 'Machine-readable invalid/ineligible reason code shown before escalation.';
COMMENT ON COLUMN cases.invalid_reason_detail IS 'Case-specific invalidation detail for customer and agent review.';
COMMENT ON COLUMN cases.appeal_priority IS 'Appeal routing priority derived from invalid_reason_code.';
