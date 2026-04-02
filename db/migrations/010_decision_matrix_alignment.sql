-- Decision matrix alignment: expand resolution_preference values and tighten status checks.

ALTER TABLE cases
DROP CONSTRAINT IF EXISTS cases_resolution_preference_check;

ALTER TABLE cases
ADD CONSTRAINT cases_resolution_preference_check
CHECK (
    resolution_preference IS NULL
    OR resolution_preference IN ('refund', 'replacement', 'return')
);

COMMENT ON COLUMN cases.dispute_subtype IS 'Canonical decision-matrix subtype. Legacy aliases are normalized at API boundary.';
COMMENT ON COLUMN cases.resolution_preference IS 'Requested resolution: refund | replacement | return.';
