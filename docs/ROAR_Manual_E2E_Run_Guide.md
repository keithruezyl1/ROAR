# ROAR Manual E2E Run Guide

This guide is for manual end-to-end validation after you:

- wipe the local database
- reseed with the standard demo/sim data
- confirm the latest WF1-WF6 node changes are published in n8n

Use this guide to run scenarios one by one and produce your own report afterward.

## Scope

This guide covers:

- intake and proof-request behavior
- WF2 bundle enrichment
- WF3 deterministic triage outcomes
- WF4 escalation summary flow
- WF5 execution flow
- WF6 case report generation

This guide assumes the codebase has already been updated to support:

- proof uploads
- `awaiting_customer_proof`
- `awaiting_customer_decision`
- richer `triage_decision`
- `evidence_bundle`
- `proof_uploads`

## Before You Start

Confirm all of these first:

1. DB wipe completed.
2. Seed data reloaded.
3. n8n workflows updated and active.
4. FastAPI app running.
5. n8n reachable by backend webhook calls.
6. Demo users can log in.
7. `case_reports` contains:
   - `evidence_bundle`
   - `proof_uploads`

## Recommended Run Order

Run in this order:

1. basic backend guardrails
2. approval paths
3. proof-required autonomous paths
4. escalation paths
5. replacement paths
6. return paths
7. invalid / customer-decision paths
8. final report-generation checks

This order gives you faster signal if something foundational is broken.

## Core Things To Verify In Every Scenario

For every case, capture:

- `case_id`
- `reference_number`
- initial `dispute_type`
- initial `dispute_subtype`
- requested `resolution_preference`
- whether proof was requested
- whether proof was uploaded
- final triage `status`
- final `resolution_path`
- final `triage_decision.triage_decision`
- final `triage_decision.resolution_type`

Then verify workflow-specific artifacts:

- WF4:
  - `escalation_summary`
  - customer-safe escalation system message
- WF5:
  - refund / replacement / return record created correctly
- WF6:
  - case report written
  - `evidence_bundle` and `proof_uploads` present when applicable

## Proof Upload Rule

The following subtypes are proof-required:

- `not_as_described`
- `damaged_goods`
- `wrong_item`
- `partial_fulfillment`

Expected behavior:

- case starts or moves to `awaiting_customer_proof`
- customer uploads 1 image through chat/API
- backend stores proof in `case_proof_uploads`
- backend runs proof analysis
- backend syncs `information_bundle`
- case moves back to `pending_triage`
- WF1/WF3 continue from there

If this does not happen, stop and record the exact failure before continuing.

## Manual Scenario Matrix

Use the seeded order IDs below unless you intentionally clone variants.

### Group A: Backend Guardrails

#### A1. Invalid dispute type

- Order: none
- Action:
  - call `POST /cases` with invalid `dispute_type`
- Expected:
  - HTTP `422`
- Verify:
  - no case created

#### A2. Duplicate open case

- Order: use any valid seeded order, for example `ORD-1001`
- Action:
  - create case
  - immediately create another open case for same `order_id`
- Expected:
  - second request returns HTTP `409`

### Group B: Refund Paths

#### B1. Refund autonomous after proof

- Order: `ORD-1001`
- Input:
  - `dispute_type=refund`
  - `dispute_subtype=not_as_described`
  - `resolution_preference=refund`
- Expected path:
  - `awaiting_customer_proof`
  - upload proof
  - `approved_executing`
  - `resolution_path=autonomous`
  - refund request created
  - case resolved
- Verify:
  - proof analysis exists
  - `triage_decision.reason` populated
  - refund request amount matches `resolution_plan.amount` or `triage_decision.eligible_amount`

#### B2. Refund approval path over threshold

- Order: `ORD-1002`
- Input:
  - `refund`
  - `not_as_described`
  - `refund`
- Expected path:
  - `awaiting_customer_proof`
  - upload proof
  - `awaiting_approval`
  - approver approves
  - refund request created
  - case resolved
- Verify:
  - no premature refund request before approval
  - `resolution_path=approval`

#### B3. Refund outside-window invalidation or escalation

- Order: `ORD-1003`
- Input:
  - `refund`
  - `not_as_described`
  - `refund`
- Expected path:
  - proof requested if applicable
  - final result should match the current WF3 logic you installed
- Verify one of:
  - `awaiting_customer_decision` with:
    - `invalid_reason_code=outside_return_window`
  - or `escalated_human_required` if your current workflow still routes this that way
- Record exactly which path occurred.

#### B4. Duplicate refund risk escalation

- Order: `ORD-1004`
- Input:
  - `refund`
  - `duplicate_charge`
  - `refund`
- Expected:
  - `escalated_human_required`
  - no autonomous refund creation
  - escalation summary generated

#### B5. Payment not confirmed escalation

- Order: `ORD-1005`
- Input:
  - `refund`
  - `not_as_described`
  - `refund`
- Expected:
  - proof requested if applicable
  - `escalated_human_required`
  - reason mentions payment not confirmed

### Group C: Delivery Refund Paths

#### C1. Non-receipt autonomous refund

- Order: `ORD-2001`
- Input:
  - `delivery`
  - `non_receipt`
  - `refund`
- Expected:
  - `approved_executing`
  - refund request created
  - case resolved

#### C2. Delayed autonomous refund

- Order: `ORD-2002`
- Input:
  - `delivery`
  - `delayed`
  - `refund`
- Expected:
  - `approved_executing`
  - refund request created
  - case resolved

#### C3. Delivered conflict escalation

- Order: `ORD-2003`
- Input:
  - `delivery`
  - `non_receipt`
  - `refund`
- Expected:
  - `escalated_human_required`
  - escalation summary saved
  - customer-safe escalation message posted

#### C4. Lost parcel escalation

- Order: `ORD-2004`
- Input:
  - `delivery`
  - `lost`
  - `refund`
- Expected:
  - `escalated_human_required`

#### C5. Delayed delivery escalation

- Order: `ORD-2005`
- Input:
  - `delivery`
  - `delayed`
  - `refund`
- Expected:
  - escalation if autonomous conditions are not met

### Group D: Return Paths

#### D1. Return approval path

- Order: `ORD-3001`
- Input:
  - `refund`
  - `return_request`
  - `return`
- Expected:
  - `awaiting_approval`
  - approver approves
  - return request created
  - case resolved

#### D2. Changed mind outside window

- Order: `ORD-3002`
- Input:
  - `refund`
  - `changed_mind`
  - `return`
- Expected:
  - either `awaiting_customer_decision` with `outside_return_window`
  - or `escalated_human_required` if your current workflow still routes this there
- Record exact behavior.

### Group E: Proof-Required Refund Escalation Paths

#### E1. Damaged goods refund autonomous

- Order: `ORD-3003`
- Input:
  - `refund`
  - `damaged_goods`
  - `refund`
- Expected:
  - `awaiting_customer_proof`
  - upload proof
  - then autonomous or approval depending on seeded amount
- Verify:
  - proof analysis data is present

#### E2. Partial fulfillment escalation

- Order: `ORD-3004`
- Input:
  - `refund`
  - `partial_fulfillment`
  - `refund`
- Expected:
  - `awaiting_customer_proof`
  - upload proof
  - `escalated_human_required`

### Group F: Replacement Paths

#### F1. Replacement autonomous path

- Order: `ORD-4001`
- Input:
  - `refund`
  - `not_as_described`
  - `replacement`
- Expected:
  - proof requested
  - proof uploaded
  - `approved_executing`
  - replacement request created
  - case resolved
- Verify:
  - replacement request `status=pending`
  - `replacement_items` reflect affected items

#### F2. Replacement approval path

- Order: `ORD-4002`
- Input:
  - `refund`
  - `wrong_item`
  - `replacement`
- Expected:
  - proof requested
  - proof uploaded
  - `awaiting_approval`
  - approver approves
  - replacement request created
  - case resolved

#### F3. Damaged goods replacement human escalation

- Order: `ORD-4003`
- Input:
  - `refund`
  - `damaged_goods`
  - `replacement`
- Expected:
  - proof requested
  - proof uploaded
  - `escalated_human_required`

#### F4. Wrong item replacement autonomous

- Order: `ORD-5002`
- Input:
  - `refund`
  - `wrong_item`
  - `replacement`
- Expected:
  - proof requested
  - proof uploaded
  - `approved_executing`
  - replacement request created

#### F5. Wrong item replacement out-of-stock / blocked

- Order: `ORD-5003`
- Input:
  - `refund`
  - `wrong_item`
  - `replacement`
- Expected:
  - either `awaiting_customer_decision` with `insufficient_inventory`
  - or escalation if your current data/rules force escalation
- Record actual result.

### Group G: Additional Delivery Replacement Paths

#### G1. Delivery replacement approval path

- Order: `ORD-6002`
- Input:
  - `delivery`
  - `non_receipt`
  - `replacement`
- Expected:
  - `awaiting_approval`
  - approver approves
  - replacement request created
  - case resolved

### Group H: Other / Uncategorized

#### H1. Other escalation

- Order: `ORD-7002`
- Input:
  - `refund`
  - `other`
  - `refund`
- Expected:
  - `escalated_human_required`

## Additional Customer-Decision Tests

These are important because they are new system behavior.

### CD1. Missing proof keeps case blocked

- Use any proof-required subtype.
- Create case.
- Do not upload proof.
- Expected:
  - case remains `awaiting_customer_proof`
  - no triage execution yet

### CD2. Proof contradicts claim

- Use a proof-required subtype.
- Upload an obviously irrelevant image.
- Expected:
  - `awaiting_customer_decision` or human escalation depending on current proof-analysis outcome
- Verify:
  - `invalid_reason_code` or escalation reason reflects proof insufficiency/contradiction

### CD3. Invalid case appeal path

- Start from any case that lands in `awaiting_customer_decision`.
- Use the appeal action in the app/API.
- Expected:
  - case leaves `awaiting_customer_decision`
  - appeal metadata persists
  - re-triage or escalation path starts per backend rules

## Per-Scenario Step Template

Use this exact checklist for each manual run:

1. Create case.
2. Record `case_id` and `reference_number`.
3. Observe first AI/system response.
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
- invalid/customer-decision cases persist:
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
### <scenario id>: <short title>

- Order:
- Case:
- Reference:
- Input:
  - dispute_type:
  - dispute_subtype:
  - resolution_preference:
- Expected:
- Actual:
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

- If a scenario lands in `awaiting_customer_decision` instead of old-style escalation, treat that as a valid modern behavior if it matches the current workflow design.
- Where this guide says “record exact behavior,” prefer recording the actual result over forcing the older expectation from outdated reports.
- If the seeded order data no longer produces the expected amount/window/inventory conditions, clone or adjust the order data before rerunning the scenario.
