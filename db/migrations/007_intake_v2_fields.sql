-- Intake V2 support: structured subtype + conditional resolution preference
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS dispute_subtype TEXT,
ADD COLUMN IF NOT EXISTS resolution_preference TEXT CHECK (resolution_preference IN ('refund', 'replacement'));

COMMENT ON COLUMN cases.dispute_subtype IS 'Specific issue classification for intake and triage.';
COMMENT ON COLUMN cases.resolution_preference IS 'Customer preference for eligible product issues: refund or replacement.';
