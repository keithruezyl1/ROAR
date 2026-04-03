# ROAR Manual E2E Run Guide

This guide is for manual end-to-end validation after you:

- wipe the local database
- reseed the standard demo and sim data
- confirm the latest WF1-WF6 workflow edits are active in n8n

Use this together with your manual report so you can validate each scenario one by one.

## Scope

This guide covers:

- intake behavior
- proof request and proof upload flow
- WF2 bundle enrichment
- WF3 deterministic triage outcomes
- WF4 escalation summary flow
- WF5 execution flow
- WF6 case report generation

## Before You Start

Confirm all of these first:

1. DB wipe completed.
2. Seed data reloaded.
3. FastAPI app running.
4. n8n running and workflows active.
5. demo users can log in.
6. `case_reports` has:
   - `evidence_bundle`
   - `proof_uploads`

## Core Things To Verify In Every Scenario

For every scenario, capture:

- `case_id`
- `reference_number`
- final `status`
- final `resolution_path`
- final `triage_decision.triage_decision`
- final `triage_decision.resolution_type`
- whether proof was requested
- whether proof was uploaded
- whether WF4 artifacts were created
- whether WF5 request records were created
- whether WF6 report was written

## Proof Upload Rule

These subtypes are proof-required:

- `not_as_described`
- `damaged_goods`
- `wrong_item`
- `partial_fulfillment`

Expected proof behavior:

- case enters `awaiting_customer_proof`
- customer uploads 1 image through UI or API
- backend stores rows in `case_proof_uploads`
- backend runs proof analysis
- backend syncs `information_bundle`
- case returns to `pending_triage`
- WF1/WF3 continue from there

If that does not happen, stop and record the exact failure before continuing.

## Suggested Manual Run Order

Run in this order:

1. backend guardrails
2. refund approval and autonomous paths
3. delivery refund paths
4. return paths
5. replacement paths
6. invalid and customer-decision paths
7. report-generation checks

## Manual Scenario Matrix

Use the seeded order IDs below unless you intentionally clone variants.

### Group A: Backend Guardrails

#### Test Case ID: A1
**Scenario Name:** Invalid dispute type  
**Order ID to test:** none  
**Case ID generated:** n/a  
**Reference:** n/a  
**Dispute Type for this test:** invalid value  
**Subtype for this test:** n/a  
**Resolution Preference for this test:** n/a  
**Expected Outcome:**

- HTTP `422` returned
- no case created
- no workflow triggered

#### Test Case ID: A2
**Scenario Name:** Duplicate open case  
**Order ID to test:** `ORD-1001` or any valid seeded order  
**Case ID generated:** fill after first create  
**Reference:** fill after first create  
**Dispute Type for this test:** use valid seeded combination  
**Subtype for this test:** use valid seeded combination  
**Resolution Preference for this test:** use valid seeded combination  
**Expected Outcome:**

- first case created successfully
- second request returns HTTP `409`
- original case remains open and unchanged

### Group B: Refund Paths

#### Test Case ID: B1
**Scenario Name:** Refund autonomous after proof  
**Order ID to test:** `ORD-1001`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `not_as_described`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case enters `awaiting_customer_proof`
- customer uploads proof successfully
- case reaches `approved_executing`
- `resolution_path=autonomous`
- refund request created
- case reaches `resolved`
- proof analysis exists
- `triage_decision.reason` populated

#### Test Case ID: B2
**Scenario Name:** Refund approval path over threshold  
**Order ID to test:** `ORD-1002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `not_as_described`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case enters `awaiting_customer_proof`
- customer uploads proof successfully
- case reaches `awaiting_approval`
- approver approves
- refund request created after approval
- no premature refund request before approval
- case reaches `resolved`

#### Test Case ID: B3
**Scenario Name:** Refund outside-window invalidation or escalation  
**Order ID to test:** `ORD-1003`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `not_as_described`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- proof requested if current workflow requires it
- acceptable outcome 1:
  - `awaiting_customer_decision`
  - `invalid_reason_code=outside_return_window`
- acceptable outcome 2:
  - `escalated_human_required`
- record exact actual behavior

#### Test Case ID: B4
**Scenario Name:** Duplicate refund risk escalation  
**Order ID to test:** `ORD-1004`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `duplicate_charge`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `escalated_human_required`
- no autonomous refund creation
- escalation summary generated

#### Test Case ID: B5
**Scenario Name:** Payment not confirmed escalation  
**Order ID to test:** `ORD-1005`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `not_as_described`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- proof requested if applicable
- case reaches `escalated_human_required`
- triage reason mentions payment not confirmed

### Group C: Delivery Refund Paths

#### Test Case ID: C1
**Scenario Name:** Non-receipt autonomous refund  
**Order ID to test:** `ORD-2001`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `non_receipt`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `approved_executing`
- refund request created
- case reaches `resolved`

#### Test Case ID: C2
**Scenario Name:** Delayed autonomous refund  
**Order ID to test:** `ORD-2002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `delayed`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `approved_executing`
- refund request created
- case reaches `resolved`

#### Test Case ID: C3
**Scenario Name:** Delivered conflict escalation  
**Order ID to test:** `ORD-2003`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `non_receipt`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `escalated_human_required`
- escalation summary saved
- customer-safe escalation message posted

#### Test Case ID: C4
**Scenario Name:** Lost parcel escalation  
**Order ID to test:** `ORD-2004`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `lost`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `escalated_human_required`

#### Test Case ID: C5
**Scenario Name:** Delayed delivery escalation  
**Order ID to test:** `ORD-2005`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `delayed`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case escalates if autonomous conditions are not met
- record exact triage reason

### Group D: Return Paths

#### Test Case ID: D1
**Scenario Name:** Return approval path  
**Order ID to test:** `ORD-3001`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `return_request`  
**Resolution Preference for this test:** `return`  
**Expected Outcome:**

- case reaches `awaiting_approval`
- approver approves
- return request created
- case reaches `resolved`

#### Test Case ID: D2
**Scenario Name:** Changed mind outside window  
**Order ID to test:** `ORD-3002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `changed_mind`  
**Resolution Preference for this test:** `return`  
**Expected Outcome:**

- acceptable outcome 1:
  - `awaiting_customer_decision`
  - invalid reason reflects outside window
- acceptable outcome 2:
  - `escalated_human_required`
- record exact actual behavior

### Group E: Proof-Required Refund Paths

#### Test Case ID: E1
**Scenario Name:** Damaged goods refund path after proof  
**Order ID to test:** `ORD-3003`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `damaged_goods`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case enters `awaiting_customer_proof`
- customer uploads proof successfully
- proof analysis data is present
- final triage result follows current seeded amount and WF3 logic
- record whether final path is autonomous or approval

#### Test Case ID: E2
**Scenario Name:** Partial fulfillment escalation  
**Order ID to test:** `ORD-3004`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `partial_fulfillment`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case enters `awaiting_customer_proof`
- customer uploads proof successfully
- case reaches `escalated_human_required`

### Group F: Replacement Paths

#### Test Case ID: F1
**Scenario Name:** Replacement autonomous path  
**Order ID to test:** `ORD-4001`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `not_as_described`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- proof requested
- proof uploaded successfully
- case reaches `approved_executing`
- replacement request created
- case reaches `resolved`
- replacement request `status=pending`
- replacement items reflect affected items

#### Test Case ID: F2
**Scenario Name:** Replacement approval path  
**Order ID to test:** `ORD-4002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `wrong_item`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- proof requested
- proof uploaded successfully
- case reaches `awaiting_approval`
- approver approves
- replacement request created
- case reaches `resolved`

#### Test Case ID: F3
**Scenario Name:** Damaged goods replacement human escalation  
**Order ID to test:** `ORD-4003`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `damaged_goods`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- proof requested
- proof uploaded successfully
- case reaches `escalated_human_required`

#### Test Case ID: F4
**Scenario Name:** Wrong item replacement autonomous  
**Order ID to test:** `ORD-5002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `wrong_item`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- proof requested
- proof uploaded successfully
- case reaches `approved_executing`
- replacement request created

#### Test Case ID: F5
**Scenario Name:** Wrong item replacement out-of-stock or blocked  
**Order ID to test:** `ORD-5003`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `wrong_item`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- acceptable outcome 1:
  - `awaiting_customer_decision`
  - `invalid_reason_code=insufficient_inventory`
- acceptable outcome 2:
  - `escalated_human_required`
- record exact actual behavior

### Group G: Additional Delivery Replacement Paths

#### Test Case ID: G1
**Scenario Name:** Delivery replacement approval path  
**Order ID to test:** `ORD-6002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `delivery`  
**Subtype for this test:** `non_receipt`  
**Resolution Preference for this test:** `replacement`  
**Expected Outcome:**

- case reaches `awaiting_approval`
- approver approves
- replacement request created
- case reaches `resolved`

### Group H: Other / Uncategorized

#### Test Case ID: H1
**Scenario Name:** Other escalation  
**Order ID to test:** `ORD-7002`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** `refund`  
**Subtype for this test:** `other`  
**Resolution Preference for this test:** `refund`  
**Expected Outcome:**

- case reaches `escalated_human_required`

## Additional Customer-Decision Tests

#### Test Case ID: CD1
**Scenario Name:** Missing proof keeps case blocked  
**Order ID to test:** use any proof-required seeded order  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** use scenario-specific value  
**Subtype for this test:** one of `not_as_described`, `damaged_goods`, `wrong_item`, `partial_fulfillment`  
**Resolution Preference for this test:** use scenario-specific value  
**Expected Outcome:**

- case remains `awaiting_customer_proof`
- no triage completion yet
- no WF5 execution yet

#### Test Case ID: CD2
**Scenario Name:** Proof contradicts claim  
**Order ID to test:** use any proof-required seeded order  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** use scenario-specific value  
**Subtype for this test:** one proof-required subtype  
**Resolution Preference for this test:** use scenario-specific value  
**Expected Outcome:**

- upload an obviously irrelevant image
- acceptable outcome 1:
  - `awaiting_customer_decision`
  - invalid reason reflects insufficient or contradictory proof
- acceptable outcome 2:
  - human escalation if proof analysis currently routes that way

#### Test Case ID: CD3
**Scenario Name:** Invalid case appeal path  
**Order ID to test:** use any case that lands in `awaiting_customer_decision`  
**Case ID generated:** fill after create  
**Reference:** fill after create  
**Dispute Type for this test:** use scenario-specific value  
**Subtype for this test:** use scenario-specific value  
**Resolution Preference for this test:** use scenario-specific value  
**Expected Outcome:**

- case leaves `awaiting_customer_decision`
- appeal metadata persists
- re-triage or escalation starts per backend rules

## Per-Scenario Step Template

Use this checklist for each manual run:

1. Create case.
2. Record `case_id` and `reference_number`.
3. Observe first AI or system response.
4. If case enters `awaiting_customer_proof`, upload 1 valid image.
5. Wait for triage to settle.
6. Record:
   - `status`
   - `resolution_path`
   - `triage_decision`
   - `resolution_type`
7. If `awaiting_approval`, approve it.
8. If `escalated_human_required`, verify WF4 artifacts.
9. If `approved_executing` or post-approval execution occurs, verify WF5 records.
10. Close case if needed to trigger WF6.
11. Verify case report exists.

## Artifact Checklist By Workflow

### WF1

- intake question posted only when appropriate
- proof request posted only when appropriate
- no looping intake questions

### WF2

- `information_bundle` populated
- proof fields preserved after enrichment

### WF3

- `triage_decision` object written to case
- status matches expected decision lane
- invalid and customer-decision cases persist:
  - `invalid_reason_code`
  - `invalid_reason_detail`

### WF4

- `escalation_summary` written
- customer sees safe escalation notice, not internal summary text

### WF5

- refund path creates `refund_requests`
- replacement path creates `replacement_requests`
- return path creates `return_requests`
- case ultimately reaches `resolved` when applicable

### WF6

- report written to `case_reports`
- `triage_decision` saved as JSON
- `resolution_actions` present when applicable
- `evidence_bundle` present when applicable
- `proof_uploads` present when applicable

## Suggested Report Format

For each scenario, capture:

```md
### <test case id>: <scenario name>

- Order ID:
- Case ID:
- Reference:
- Dispute Type:
- Dispute Subtype:
- Resolution Preference:
- Expected Outcome:
- Actual Outcome:
- Final status:
- Final resolution_path:
- Final triage_decision:
- Proof requested:
- Proof uploaded:
- Refund request created:
- Replacement request created:
- Return request created:
- Escalation summary present:
- Case report present:
- Result: passed | failed | partial
- Notes:
```

## Stop Conditions

Stop the run and debug before continuing if any of these occur:

- proof upload does not move case out of `awaiting_customer_proof`
- case never leaves `pending_triage`
- WF3 writes old decision values like `autonomous` or `escalation` to the case instead of the new case status model
- WF5 resolves a case without creating the expected request record
- WF6 fails to write a case report after close

## Notes

- If a scenario lands in `awaiting_customer_decision` instead of old-style escalation, treat that as valid if it matches the current workflow design.
- Where this guide says "record exact behavior," prefer recording the actual result over forcing an older expectation from stale reports.
- If the seeded order data no longer produces the expected amount, window, or inventory conditions, clone or adjust the order data before rerunning the scenario.
