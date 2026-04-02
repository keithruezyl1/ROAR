-- Enforce canonical case statuses used by API/UI filters

ALTER TABLE cases
DROP CONSTRAINT IF EXISTS cases_status_check;

ALTER TABLE cases
ADD CONSTRAINT cases_status_check
CHECK (
    status IN (
        'pending_triage',
        'awaiting_approval',
        'approved_executing',
        'rejected_human_required',
        'escalated_human_required',
        'resolved',
        'closed'
    )
);