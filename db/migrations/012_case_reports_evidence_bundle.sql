-- Extend case_reports to store proof-aware evidence payloads for WF6 outputs.

ALTER TABLE case_reports
ADD COLUMN IF NOT EXISTS evidence_bundle JSONB,
ADD COLUMN IF NOT EXISTS proof_uploads JSONB;

COMMENT ON COLUMN case_reports.evidence_bundle IS 'Evidence payload stored with the generated case report, including proof analysis and attachment metadata.';
COMMENT ON COLUMN case_reports.proof_uploads IS 'Proof attachment metadata included in the generated case report.';
